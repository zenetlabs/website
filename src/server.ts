import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { withDeferredEntry } from '@/lib/deferred-entry';
import { isHtml } from '@/lib/http';
import { isInternalPath } from '@/lib/internal-path';
import {
  isNegotiable,
  markdownTarget,
  toMarkdownResponse,
} from '@/lib/markdown-response';
import { isOwnedHost, redirectTarget } from '@/lib/redirects';
import { withSecurityHeaders } from '@/lib/security-headers';

const entry = createServerEntry({
  async fetch(request, opts) {
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
    const response = await handler.fetch(markdown?.upstream ?? request, opts);
    const html = isHtml(response);
    const converted =
      html && markdown
        ? await toMarkdownResponse(response, markdown.upstream.url)
        : withDeferredEntry(response);
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
