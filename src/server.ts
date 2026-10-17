import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { redirectTarget } from '@/lib/redirects';
import { withSecurityHeaders } from '@/lib/security-headers';

export default createServerEntry({
  async fetch(request, opts) {
    const target = redirectTarget(new URL(request.url));
    if (target) return Response.redirect(target, 301);
    return withSecurityHeaders(await handler.fetch(request, opts));
  },
});
