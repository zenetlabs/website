const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'";

export function privateHeaders(contentType: string): Headers {
  return new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': CSP,
  });
}

export function textResponse(text: string, status: number): Response {
  return new Response(text, {
    status,
    headers: privateHeaders('text/plain; charset=utf-8'),
  });
}

export function methodNotAllowed(allow: string): Response {
  return new Response(null, {
    status: 405,
    headers: { Allow: allow, 'Cache-Control': 'no-store' },
  });
}

export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

export function internalHandlers<Get>(get: Get) {
  return { GET: get, ANY: () => methodNotAllowed('GET') };
}
