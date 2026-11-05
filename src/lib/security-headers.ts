// The microphone is allowed for this origin only when voice calls are built in;
// a dark build keeps it off.
const PERMISSIONS = __VOICE__
  ? 'camera=(), microphone=(self), geolocation=()'
  : 'camera=(), microphone=(), geolocation=()';

export const HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['Strict-Transport-Security', 'max-age=31536000'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['X-Frame-Options', 'DENY'],
  ['Permissions-Policy', PERMISSIONS],
];

// A response may tighten its own Referrer-Policy (the booking links carry a
// token in the query) to one of these; anything else, and every other
// header, is always ours.
const STRICTER_REFERRER = new Set(['no-referrer', 'same-origin']);

export function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  const own = secured.headers.get('Referrer-Policy');
  for (const [name, value] of HEADERS) {
    if (
      name === 'Referrer-Policy' &&
      own !== null &&
      STRICTER_REFERRER.has(own)
    ) {
      continue;
    }
    secured.headers.set(name, value);
  }
  return secured;
}
