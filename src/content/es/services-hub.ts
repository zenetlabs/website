import { services } from '@/content/es/services';
import type { ServicesHubContent } from '@/content/types';
import { formatPriceSummary } from '@/lib/money';

const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const servicesHub = {
  meta: {
    title: 'Servicios',
    metaTitle: 'Consultoría de IA y automatización para pymes | Zenet Labs',
    description:
      'Del diagnóstico a precio cerrado a automatizaciones, integraciones, agentes de IA, software a medida y formación: todos nuestros servicios, con precio.',
  },
  eyebrow: 'Servicios',
  title: {
    before: 'Consultoría de IA que acaba en ',
    emphasis: 'sistemas funcionando',
    after: '',
  },
  // TODO(albert): review the "consultoría pequeña" claim
  lead: 'Zenet Labs es una consultoría de IA pequeña para pymes de 10 a 100 personas. No nos quedamos en el consejo: conectamos tus herramientas, automatizamos el trabajo manual, ponemos agentes de IA en producción y formamos a tu equipo, con precios publicados y un diagnóstico a precio cerrado para empezar.',
  cards: {
    automation: {
      name: 'Automatización de procesos',
      summary:
        'Programas que hacen los pasos repetitivos de tus procesos, de documentos y aprobaciones a recordatorios e informes.',
    },
    integrations: {
      name: 'Integraciones',
      summary:
        'Holded, tu tienda online, HubSpot y WhatsApp conectados, para que pedidos, facturas y clientes pasen solos de uno a otro.',
    },
    agents: {
      name: 'Agentes de IA',
      summary:
        'Agentes que clasifican consultas, redactan respuestas y procesan documentos, con una persona aprobando lo importante.',
    },
    software: {
      name: 'Software a medida',
      summary:
        'Portales de clientes, herramientas internas y aplicaciones web hechas según cómo trabajas.',
    },
    training: {
      name: 'Formación en IA para equipos',
      summary:
        'Talleres prácticos sobre tus propios procesos y mentoría mensual mientras el equipo adopta la IA.',
    },
  },
  also: {
    title: 'Diagnóstico, mantenimiento y crecimiento',
    lead: 'Todo proyecto empieza por el diagnóstico. Cuando ya funciona, el mantenimiento hace que siga funcionando y el trabajo de crecimiento ayuda a que te encuentren los clientes adecuados.',
  },
  start: {
    title: '¿No sabes qué servicio necesitas?',
    text: `Empieza por el diagnóstico de automatización. En una o dos semanas analizamos tus herramientas y el trabajo manual, y te damos un plan con precio. Cuesta ${diagnostic}, IVA no incluido, y se descuenta del proyecto si sigues adelante en 60 días.`,
    button: 'Reserva un diagnóstico',
  },
  pricing: 'Ver todos los precios',
} satisfies ServicesHubContent;
