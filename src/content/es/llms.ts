import type { LlmsCopy } from '@/content/types';

export const llms = {
  operator: 'Este sitio lo opera {legalName} ({taxId}), {address}.',
  markdown:
    'Todas las páginas se sirven también en Markdown: añade `.md` a su URL (la portada es {home}) o envía `Accept: text/markdown`.',
  fullNote:
    'Este archivo contiene el texto completo del sitio en español, generado a partir del mismo contenido que sus páginas. El índice breve está en {index}; las páginas legales aparecen en Páginas.',
  headings: {
    services: 'Servicios',
    pages: 'Páginas',
    faq: 'Preguntas frecuentes',
    portfolio: 'Nuestras empresas',
    contact: 'Contacto',
    pricing: 'Servicios y precios',
    problems: 'Qué resolvemos',
    process: 'Cómo trabajamos',
    cases: 'Casos',
    about: 'Sobre Zenet Labs',
    holded: 'Integraciones con Holded',
    servicePages: 'Servicios en detalle',
  },
  labels: {
    email: 'Correo',
    form: 'Formulario de contacto',
    full: 'Texto completo',
    index: 'Índice',
    otherLanguage: 'English version',
  },
} satisfies LlmsCopy;
