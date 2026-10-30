import type { Services } from '@/content/types';

export const services = {
  diagnostic: {
    id: 'diagnostic',
    name: 'Diagnóstico de automatización',
    summary:
      'Una o dos semanas analizando tus herramientas y el trabajo manual, con un plan con precio al final. Se descuenta del proyecto si sigues en 60 días.',
    prices: [{ id: 'diagnostic', min: 1500, unit: 'one-off', currency: 'EUR' }],
  },
  integration: {
    id: 'integration',
    name: 'Integración o automatización',
    summary:
      'Conectamos dos o más herramientas para que los datos pasen solos: tienda y ERP, CRM y facturación, formularios y Excel.',
    prices: [
      {
        id: 'integration',
        min: 4000,
        qualifier: 'from',
        unit: 'one-off',
        currency: 'EUR',
      },
    ],
  },
  agent: {
    id: 'agent',
    name: 'Agente de IA en producción',
    summary:
      'Un agente que hace una tarea real de principio a fin, como clasificar, responder o leer documentos, con una persona aprobando lo importante.',
    prices: [
      {
        id: 'agent',
        min: 8000,
        max: 20000,
        unit: 'one-off',
        currency: 'EUR',
      },
    ],
  },
  web: {
    id: 'web',
    name: 'Web o app a medida',
    summary:
      'Una web, un portal de clientes o una herramienta interna hecha a la medida de cómo trabajas.',
    prices: [
      {
        id: 'web',
        min: 6000,
        qualifier: 'from',
        unit: 'one-off',
        currency: 'EUR',
      },
    ],
  },
  training: {
    id: 'training',
    name: 'Formación y mentoría en IA para equipos',
    summary:
      'Talleres prácticos sobre tus propios procesos y mentoría mensual mientras el equipo adopta la IA.',
    prices: [
      {
        id: 'training-workshop',
        label: 'Taller',
        min: 1200,
        qualifier: 'from',
        unit: 'one-off',
        currency: 'EUR',
      },
      {
        id: 'training-mentoring',
        label: 'Mentoría',
        min: 600,
        unit: 'month',
        currency: 'EUR',
      },
    ],
  },
  // TODO(albert): tier names and scope
  maintenance: {
    id: 'maintenance',
    name: 'Mantenimiento y operación',
    summary:
      'Monitorización, correcciones, actualizaciones y mejoras mensuales de lo que hemos construido.',
    prices: [
      {
        id: 'maintenance-essential',
        label: 'Esencial',
        note: 'Una integración o automatización: vigilancia y correcciones.',
        min: 300,
        unit: 'month',
        currency: 'EUR',
      },
      {
        id: 'maintenance-standard',
        label: 'Estándar',
        note: 'Varias automatizaciones y mejoras cada mes.',
        min: 750,
        unit: 'month',
        currency: 'EUR',
      },
      {
        id: 'maintenance-extended',
        label: 'Ampliado',
        note: 'Agentes de IA en producción: evaluación, ajuste y control de costes.',
        min: 1500,
        unit: 'month',
        currency: 'EUR',
      },
    ],
  },
  growth: {
    id: 'growth',
    name: 'Crecimiento: SEO, contenidos y conversión',
    summary:
      'Trabajo mensual en buscadores, contenidos y conversión para que te encuentren los clientes adecuados y te escriban.',
    prices: [
      {
        id: 'growth',
        min: 800,
        qualifier: 'from',
        unit: 'month',
        currency: 'EUR',
      },
    ],
  },
} satisfies Services;
