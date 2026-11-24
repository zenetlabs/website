import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { withDeferredEntry } from '@/lib/deferred-entry';
import { isHtml } from '@/lib/http';
import { isInternalPath } from '@/lib/internal-path';
import {
  isNegotiable,
  markdownTarget,
  renderMarkdown,
} from '@/lib/markdown-response';
import { isOwnedHost, redirectTarget } from '@/lib/redirects';
import { withSecurityHeaders } from '@/lib/security-headers';

type Handled = Parameters<typeof handler.fetch>;

async function respond(
  request: Handled[0],
  opts: Handled[1],
): Promise<Response> {
  const url = new URL(request.url);
  if (!isOwnedHost(url.hostname)) {
    return new Response('Misdirected request', { status: 421 });
  }
  const target = redirectTarget(url);
  if (target) {
    return new Response(null, {
      status: 301,
      headers: { Location: target, 'Cache-Control': 'max-age=3600' },
    });
  }
  if (isInternalPath(url.pathname)) {
    const { accessGate } = await import('@/server/access');
    const denied = await accessGate(request, __SERVER__.access);
    if (denied) return withSecurityHeaders(denied);
  }
  const markdown = markdownTarget(url, request);
  const rendered = markdown
    ? await renderMarkdown(
        async (upstream) => handler.fetch(upstream, opts),
        markdown.upstream,
        markdown.upstream.url,
      )
    : null;
  const response = rendered?.response ?? (await handler.fetch(request, opts));
  const html = rendered?.html ?? isHtml(response);
  const converted = rendered?.html ? response : withDeferredEntry(response);
  const page = withSecurityHeaders(
    request.method === 'HEAD' && markdown
      ? new Response(null, converted)
      : converted,
  );
  const varies = markdown ? markdown.vary : isNegotiable(request);
  if (varies && (html || page.status === 406)) {
    page.headers.append('Vary', 'Accept');
  }
  if (page.status === 404) page.headers.set('X-Robots-Tag', 'noindex');
  return page;
}

const entry = createServerEntry({
  async fetch(request, opts) {
    try {
      return await respond(request, opts);
    } finally {
      // Before the response goes: workerd cannot read the request after that.
      if (request.body !== null && !request.bodyUsed) {
        const { drainUnreadBody } = await import('@/server/request');
        await drainUnreadBody(request);
      }
    }
  },
});

export default {
  ...entry,
  scheduled(
    controller: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      import('@/server/scheduled').then(({ runScheduled }) =>
        runScheduled(env, controller.scheduledTime),
      ),
    );
  },
};
