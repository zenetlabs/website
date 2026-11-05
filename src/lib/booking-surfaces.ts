// The browser surfaces a booking is sent from. Each renders Turnstile with its
// own action, so a token minted for one fails on another (server and clients
// read the same table).
export const SURFACES = ['page', 'chat', 'webmcp'] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_ACTION = {
  page: 'book-page',
  chat: 'book-chat',
  webmcp: 'book-webmcp',
} as const satisfies Record<Surface, string>;
