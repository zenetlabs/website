import type { PricingPageContent } from '@/content/types';

export const pricingPage = {
  meta: {
    title: 'Precios',
    metaTitle: 'Precios de automatización y agentes de IA | Zenet Labs',
    description:
      'Precios publicados en euros, IVA no incluido: diagnóstico, integraciones, agentes de IA en producción, web a medida, formación, mantenimiento y SEO.',
  },
  catalog: 'Servicios y precios de Zenet Labs',
  eyebrow: 'Precios',
  title: { before: 'Precios claros ', emphasis: 'antes', after: ' de empezar' },
  lead: 'Todo proyecto empieza con un diagnóstico a precio cerrado, para que el siguiente presupuesto salga de tus procesos reales y no de una estimación a ciegas.',
  taxNote: 'Todos los precios están en euros y no incluyen el IVA.',
  labels: {
    price: 'Precio',
    includes: 'Incluye',
    timeline: 'Plazo',
    more: 'Más sobre',
  },
  // TODO(albert): confirm every list
  details: {
    diagnostic: {
      includes: [
        'Entrevistas con quienes hacen el trabajo',
        'Mapa de tus herramientas y de cómo se mueven los datos entre ellas',
        'Horas dedicadas a mano, proceso a proceso',
        'Plan priorizado con precio y plazo para cada fase',
      ],
      timeline: '1–2 semanas',
    },
    integration: {
      includes: [
        'Alcance definido en el diagnóstico',
        'Montado en tus cuentas, para que sea tuyo',
        'Avisos y reintentos cuando algo falla',
        'Documentación y traspaso a tu equipo',
      ],
    },
    agent: {
      includes: [
        'Batería de pruebas con tus casos reales',
        'Aprobación humana en cada acción con consecuencias',
        'Límites de uso y de coste',
        'Monitorización y registro de cada acción',
      ],
    },
    web: {
      includes: [
        'Diseño y desarrollo según tus procesos',
        'Rápida, accesible y preparada para buscadores',
        'Conectada a tus herramientas desde el primer día',
        'Alojamiento configurado en tus cuentas',
      ],
    },
    training: {
      includes: [
        'Talleres sobre tus propios procesos, no sobre ejemplos genéricos',
        'Mentoría: revisiones periódicas de lo que construye el equipo',
        'Una política de uso que el equipo pueda cumplir',
      ],
    },
    maintenance: {
      includes: [
        'Monitorización y avisos de errores',
        'Correcciones y actualizaciones cuando cambian tus herramientas',
        'Revisión mensual de qué mejorar',
      ],
    },
    growth: {
      includes: [
        'SEO técnico y plan de contenidos',
        'Páginas y artículos que responden a preguntas reales de clientes',
        'Mejoras de conversión basadas en lo que hacen las visitas',
      ],
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
  cta: {
    title: 'Empieza por el diagnóstico',
    text: 'Cuéntanos qué hace tu equipo a mano y te responderemos personalmente.',
    button: 'Reserva un diagnóstico',
    faq: 'Leer las preguntas frecuentes',
  },
} satisfies PricingPageContent;
