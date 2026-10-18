import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { isHtml } from '@/lib/http';
import { prefersMarkdown } from '@/lib/markdown';
import { toMarkdownResponse, withHtmlAccept } from '@/lib/markdown-response';
import { isOwnedHost, redirectTarget } from '@/lib/redirects';
import { withLowScriptPriority } from '@/lib/script-priority';
import { withSecurityHeaders } from '@/lib/security-headers';

export default createServerEntry({
  async fetch(request, opts) {
    const url = new URL(request.url);
    if (!isOwnedHost(url.hostname)) {
      return new Response('Misdirected request', { status: 421 });
    }
    const target = redirectTarget(url);
    if (target) return Response.redirect(target, 301);
    const negotiable = request.method === 'GET' || request.method === 'HEAD';
    const markdown =
      negotiable && prefersMarkdown(request.headers.get('Accept'));
    const response = await handler.fetch(
      markdown ? withHtmlAccept(request) : request,
      opts,
    );
    const html = isHtml(response);
    const converted =
      html && markdown
        ? await toMarkdownResponse(response, request.url)
        : withLowScriptPriority(response);
    const page = withSecurityHeaders(
      request.method === 'HEAD' && markdown
        ? new Response(null, converted)
        : converted,
    );
    if (negotiable && (html || page.status === 406)) {
      page.headers.append('Vary', 'Accept');
    }
    if (page.status === 404) page.headers.set('X-Robots-Tag', 'noindex');
    return page;
  },
});
