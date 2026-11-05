// TODO(albert): review this page: the tiers, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [essential, standard, extended] = services.maintenance.prices;

export const maintenance = {
  meta: {
    metaTitle: 'Mantenimiento de automatizaciones y agentes | Zenet Labs',
    description:
      'Mantenimiento mensual de las integraciones, automatizaciones y agentes de IA que construimos: vigilancia, correcciones y revisión, en tres planes.',
  },
  hero: {
    title: {
      before: 'Mantenimiento para que tus ',
      emphasis: 'automatizaciones sigan funcionando',
      after: '',
    },
    lead: `Las herramientas cambian, y una automatización que funcionaba el mes pasado puede dejar de hacerlo sin avisar. Nuestro mantenimiento vigila lo que construimos, lo corrige y lo actualiza cuando cambian tus herramientas, y cada mes revisa qué mejorar. Hay tres planes: ${formatPrice('es', essential)}, ${formatPrice('es', standard)} y ${formatPrice('es', extended)}, IVA no incluido.`,
  },
  facts: {
    who: 'Empresas con una integración, una automatización o un agente de IA nuestro en producción',
    timeline:
      'Mensual y opcional; eliges el plan cuando el proyecto ya funciona',
    start: 'Elige un plan cuando tu proyecto esté en marcha',
  },
  cta: {
    title: 'Mantén tu proyecto en marcha',
    text: 'Cuéntanos qué hemos construido para ti y qué necesitas vigilar. Te respondemos con el plan que encaje.',
    button: 'Pregunta por el mantenimiento',
  },
  useCases: {
    title: {
      before: 'Lo que un plan ',
      emphasis: 'te quita de encima',
      after: '',
    },
    items: [
      {
        id: 'monitoring',
        title: 'Monitorización y avisos de errores',
        text: 'Vigilamos las automatizaciones y los agentes que construimos, para que un fallo se detecte y se resuelva antes de que llegue a tus clientes.',
      },
      {
        id: 'fixes',
        title: 'Correcciones',
        text: 'Cuando algo se rompe, buscamos la causa y lo arreglamos, sin que tu equipo tenga que buscar apaños.',
      },
      {
        id: 'updates',
        title: 'Actualizaciones cuando cambian tus herramientas',
        text: 'Cuando cambia una de tus herramientas, actualizamos la conexión para que los datos sigan moviéndose.',
      },
      {
        id: 'review',
        title: 'Una revisión mensual',
        text: 'Cada mes miramos qué mejorar, para que las automatizaciones sigan el ritmo de cómo trabaja tu equipo.',
      },
    ],
  },
  how: {
    title: {
      before: 'Cómo funciona un plan ',
      emphasis: 'mes a mes',
      after: '',
    },
    steps: [
      {
        id: 'choose',
        label: 'Elegir',
        text: 'Cuando tu proyecto ya funciona, eliges el plan que encaja con lo que construimos.',
      },
      {
        id: 'watch',
        label: 'Vigilar',
        text: 'Monitorizamos tus automatizaciones y agentes y recibimos un aviso cuando uno falla.',
      },
      {
        id: 'fix',
        label: 'Corregir',
        text: 'Arreglamos lo que se rompe y actualizamos las conexiones cuando cambian tus herramientas.',
      },
      {
        id: 'improve',
        label: 'Mejorar',
        text: 'Cada mes revisamos qué mejorar y, en los agentes, los ajustamos y mantenemos su coste bajo control.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    title: {
      before: 'Trabajamos ',
      emphasis: 'de la misma manera',
      after: '',
    },
    text: 'Los agentes y las automatizaciones de Viatsy funcionan cada día, y una persona revisa lo que redactan antes de que salga. El mantenimiento aplica la misma rutina a los tuyos.',
    points: [
      'Un primer borrador de respuesta para cada consulta, que una persona revisa y envía',
      'Solicitudes de pago y recordatorios enviados a su debido tiempo',
    ],
    page: 'viatsyCase',
  },
  faq: {
    title: {
      before: 'Preguntas sobre el ',
      emphasis: 'mantenimiento',
      after: '',
    },
    items: [
      {
        id: 'maintenance-needed',
        question: '¿De verdad necesitan mantenimiento las automatizaciones?',
        answer:
          'Sí. Las herramientas que conectan cambian sus campos, reglas y pantallas, y una automatización que funcionaba el mes pasado puede dejar de hacerlo sin avisar. La monitorización lo detecta y lo corregimos y actualizamos cuando cambian tus herramientas.',
      },
      {
        id: 'maintenance-plans',
        question: '¿En qué se diferencian los tres planes?',
        answer: `${essential.label} (${formatPriceSummary('es', [essential])}) cubre una integración o automatización con vigilancia y correcciones. ${standard.label} (${formatPriceSummary('es', [standard])}) cubre varias automatizaciones y añade mejoras cada mes. ${extended.label} (${formatPriceSummary('es', [extended])}) cubre agentes de IA en producción, con evaluación, ajuste y control de costes.`,
      },
      {
        id: 'maintenance-optional',
        question: '¿Es obligatorio el mantenimiento?',
        answer:
          'No. El mantenimiento es mensual y opcional, y eliges el plan cuando el proyecto ya funciona. Montamos todo en tus cuentas siempre que podemos, así que, si dejamos de trabajar juntos, todo sigue funcionando y queda documentado.',
      },
      {
        id: 'maintenance-agents',
        question: '¿Qué cubre el mantenimiento de un agente de IA?',
        answer:
          'Evaluación, ajuste y control de costes, dentro de los límites de uso y de coste acordados al construir el agente. Cada acción queda registrada, así que cuando algo falla buscamos la causa, la corregimos y añadimos el caso a las pruebas del agente.',
      },
    ],
  },
  related: ['agents', 'integrations'],
} satisfies ServicePageContent;
