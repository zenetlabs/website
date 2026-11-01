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

// A transport error: `{ ok: false, error }` with the status, never cached.
export function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (error === 'rate') headers.set('Retry-After', '60');
  return Response.json({ ok: false, error, ...extra }, { status, headers });
}

// A success answer: `{ ok: true, ...body }`, never cached.
export function jsonOk(body: Record<string, unknown> = {}): Response {
  return Response.json(
    { ok: true, ...body },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

export function internalHandlers<Get>(get: Get) {
  return { GET: get, ANY: () => methodNotAllowed('GET') };
}
