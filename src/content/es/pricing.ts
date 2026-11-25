import { serviceIncludes } from '@/content/es/service-includes';
import type { PricingPageContent } from '@/content/types';

export const pricingPage = {
  meta: {
    title: 'Precios',
    metaTitle: 'Precios de automatización y agentes de IA | Zenet Labs',
    description:
      'Precios publicados en euros, IVA no incluido: diagnóstico, integraciones, agentes de IA en producción, web a medida, formación, mantenimiento y SEO.',
  },
  catalog: 'Servicios y precios de Zenet Labs',
  title: { before: 'Precios claros ', emphasis: 'antes', after: ' de empezar' },
  lead: 'Todo proyecto empieza con un diagnóstico a precio cerrado, para que el siguiente presupuesto salga de tus procesos reales y no de una estimación a ciegas.',
  taxNote: 'Todos los precios están en euros y no incluyen el IVA.',
  labels: {
    price: 'Precio',
    includes: 'Incluye',
    timeline: 'Plazo',
    more: 'Más sobre',
    startHere: 'Empieza aquí',
    book: 'Reservar el diagnóstico',
  },
  // TODO(albert): confirm every list (in service-includes.ts)
  details: {
    diagnostic: {
      includes: serviceIncludes.diagnostic,
      timeline: '1–2 semanas',
    },
    integration: {
      includes: serviceIncludes.integration,
    },
    agent: {
      includes: serviceIncludes.agent,
    },
    web: {
      includes: serviceIncludes.web,
    },
    training: {
      includes: serviceIncludes.training,
    },
    maintenance: {
      includes: serviceIncludes.maintenance,
    },
    growth: {
      includes: serviceIncludes.growth,
    },
  },
  how: {
    title: 'Cómo funcionan los precios',
    items: [
      'El diagnóstico tiene precio cerrado. Si sigues adelante en 60 días, su importe se descuenta del proyecto.',
      'Los precios «desde» y los rangos dependen de cuántas herramientas, cuánto volumen y cuánta IA haya. Tras el diagnóstico tienes un presupuesto cerrado para cada fase.',
      'El mantenimiento es mensual y opcional; eliges el plan cuando el proyecto ya funciona.',
      'El código, las cuentas y los datos que montamos para ti son tuyos.',
    ],
  },
  calculator: {
    title: '¿No sabes qué línea encaja?',
    text: 'Responde seis preguntas y verás un rango orientativo para tu proyecto, sin dejar tu correo.',
    link: 'Abrir la calculadora de precios',
  },
  faq: {
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'plazos, coste y propiedad',
      after: '',
    },
  },
  cta: {
    title: 'Empieza por el diagnóstico',
    text: 'Cuéntanos qué hace tu equipo a mano y te responderemos.',
    button: 'Reservar una llamada',
  },
} satisfies PricingPageContent;
