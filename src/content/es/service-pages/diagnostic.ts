// TODO(albert): review this page: the steps, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice } from '@/lib/money';

const [price] = services.diagnostic.prices;

export const diagnostic = {
  meta: {
    metaTitle: 'Diagnóstico de automatización a precio cerrado | Zenet Labs',
    description:
      'Diagnóstico de automatización en 1–2 semanas: mapeamos tus herramientas y te damos un plan con coste. Se descuenta del proyecto si sigues en 60 días.',
  },
  hero: {
    title: {
      before: 'Diagnóstico de automatización: un ',
      emphasis: 'plan con precio',
      after: ' en una o dos semanas',
    },
    lead: `El diagnóstico de automatización es donde empieza todo proyecto de Zenet Labs. En una o dos semanas analizamos tus herramientas y el trabajo que tu equipo sigue haciendo a mano, y te damos un plan priorizado con precio y plazo para cada fase. Cuesta ${formatPrice('es', price)}, IVA no incluido, y se descuenta del proyecto si sigues adelante en 60 días.`,
  },
  facts: {
    who: 'Pymes de 10 a 100 personas que trabajan con varias herramientas y pierden horas pasando datos de una a otra',
    timeline: '1–2 semanas',
    start:
      'Una llamada breve para acordar el alcance y los procesos que miraremos',
  },
  cta: {
    title: 'Reserva tu diagnóstico',
    text: 'Cuéntanos qué herramientas usas y qué sigue haciendo tu equipo a mano. Te respondemos personalmente y acordamos el alcance en una llamada breve.',
    button: 'Reservar una llamada',
  },
  useCases: {
    title: {
      before: 'Lo que ',
      emphasis: 'recibes al final',
      after: '',
    },
    items: [
      {
        id: 'interviews',
        title: 'Entrevistas con quienes hacen el trabajo',
        text: 'El plan sale de las personas que llevan los procesos cada día, no de suposiciones hechas desde un despacho.',
      },
      {
        id: 'tool-map',
        title: 'Un mapa de tus herramientas',
        text: 'Qué herramientas usas y cómo se mueven los datos entre ellas, para ver dónde se copian a mano.',
      },
      {
        id: 'hours',
        title: 'Horas dedicadas a mano',
        text: 'Cuánto tarda hoy cada proceso, uno por uno, lo que da al plan una referencia con la que comparar después de la puesta en marcha.',
      },
      {
        id: 'plan',
        title: 'Un plan priorizado',
        text: 'Un precio y un plazo para cada fase, para que decidas qué construir primero y qué dejar.',
      },
    ],
  },
  how: {
    title: {
      before: 'De la primera llamada a ',
      emphasis: 'un plan con precio',
      after: '',
    },
    steps: [
      {
        id: 'call',
        label: 'Llamada',
        text: 'Acordamos el alcance en una llamada breve: qué procesos y qué herramientas miraremos.',
      },
      {
        id: 'map',
        label: 'Mapa',
        text: 'Hablamos con quienes hacen el trabajo y mapeamos tus herramientas y cómo se mueven los datos entre ellas.',
      },
      {
        id: 'measure',
        label: 'Medición',
        text: 'Medimos cuánto tarda hoy cada proceso, para poder comparar el resultado con las mismas cifras más adelante.',
      },
      {
        id: 'plan',
        label: 'Plan',
        text: 'Recibes un plan priorizado con precio y plazo para cada fase, y decides si sigues adelante.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    title: {
      before: 'Empezamos por ',
      emphasis: 'nuestras propias empresas',
      after: '',
    },
    text: 'Antes de construir una automatización para un cliente, la hacemos funcionar en un negocio nuestro. En Viatsy, nuestra empresa de viajes, los agentes preparan respuestas y propuestas y una persona revisa lo que llega a un cliente.',
    points: [
      'Un primer borrador de respuesta para cada consulta, que una persona revisa y envía',
      'Las confirmaciones de proveedores se pasan a la reserva y con ellas se monta la documentación del viaje',
    ],
    page: 'viatsyCase',
  },
  faq: {
    title: {
      before: 'Preguntas sobre el ',
      emphasis: 'diagnóstico',
      after: '',
    },
    items: [
      {
        id: 'diagnostic-know-process',
        question: '¿Tenemos que saber qué automatizar antes de empezar?',
        answer:
          'No. Averiguarlo es para lo que sirve el diagnóstico. Hablamos con quienes hacen el trabajo, medimos cuánto tarda cada proceso a mano y los ordenamos, para que el plan empiece por lo que más importa.',
      },
      {
        id: 'diagnostic-credit',
        question: '¿Qué pasa con el importe si seguimos adelante?',
        answer:
          'Si continúas en 60 días, el importe del diagnóstico se descuenta del proyecto. Si decides no hacerlo, habrás pagado un importe cerrado por un plan valorado, sin más compromiso.',
      },
      {
        id: 'diagnostic-not-worth-it',
        question: '¿Y si resulta que automatizar no compensa?',
        answer:
          'Te lo decimos. El plan pone precio y plazo a cada fase junto a las horas que dedicas hoy, y si una automatización no se amortiza, lo decimos en lugar de vendértela.',
      },
      {
        id: 'diagnostic-after',
        question: '¿Qué pasa después del plan?',
        answer:
          'Decides tú. La primera fase se plantea para estar en marcha en semanas, no en meses, y los agentes y las aplicaciones a medida más grandes se dividen en fases, cada una con su resultado. Tras la puesta en marcha, el mantenimiento es opcional.',
      },
    ],
  },
  related: ['automation', 'agents'],
} satisfies ServicePageContent;
