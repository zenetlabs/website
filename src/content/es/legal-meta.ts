import type { PageMeta } from '@/content/types';

const cookies = {
  title: 'Política de cookies',
  metaTitle: 'Política de cookies | Zenet Labs',
  description:
    'Zenet Labs no usa cookies analíticas ni publicitarias. Descubre qué cookies necesarias puede usar Cloudflare, cómo funciona Turnstile y cómo gestionarlas.',
} satisfies PageMeta;

export const legalMeta = {
  privacy: {
    title: 'Política de privacidad',
    metaTitle: 'Política de privacidad | Zenet Labs',
    description:
      'Cómo recoge, usa y protege Zenet Labs los datos que nos envías por el formulario de contacto, quién es el responsable y cómo ejercer tus derechos.',
  },
  cookies,
  cookiesAnalytics: {
    ...cookies,
    description:
      'Cómo usa cookies Zenet Labs: Google Analytics solo con tu consentimiento, Cloudflare Web Analytics sin cookies, Turnstile y cómo cambiar tu elección.',
  },
} satisfies Record<'privacy' | 'cookies' | 'cookiesAnalytics', PageMeta>;
