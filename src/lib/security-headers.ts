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

export function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of HEADERS) secured.headers.set(name, value);
  return secured;
}
