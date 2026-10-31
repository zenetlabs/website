import type { PageMeta } from '@/content/types';

export const legalMeta = {
  privacy: {
    title: 'Política de privacidad',
    metaTitle: 'Política de privacidad | Zenet Labs',
    description:
      'Cómo recoge, usa y protege Zenet Labs los datos que nos envías por el formulario de contacto, quién es el responsable y cómo ejercer tus derechos.',
  },
  cookies: {
    title: 'Política de cookies',
    metaTitle: 'Política de cookies | Zenet Labs',
    description:
      'Zenet Labs no usa cookies analíticas ni publicitarias. Descubre qué cookies necesarias puede usar Cloudflare, cómo funciona Turnstile y cómo gestionarlas.',
  },
} satisfies Record<'privacy' | 'cookies', PageMeta>;
