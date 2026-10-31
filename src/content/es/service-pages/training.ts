// TODO(albert): review this page: lead times, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice } from '@/lib/money';

const [workshop, mentoring] = services.training.prices;

export const training = {
  meta: {
    metaTitle: 'Formación en IA para equipos y empresas | Zenet Labs',
    description:
      'Formación práctica en IA para equipos, sobre los procesos reales de tu empresa y no con demos genéricas, y mentoría mensual mientras el equipo la aplica.',
  },
  hero: {
    eyebrow: 'Servicios · Formación en IA',
    title: {
      before: 'Formación en IA para equipos, sobre el ',
      emphasis: 'trabajo real',
      after: ' de tu empresa',
    },
    // TODO(albert): confirm the lead time
    lead: `Nuestra formación en IA es un taller práctico en el que tu equipo aprende a usar la IA en sus propios procesos, seguido, si quieres, de una mentoría mensual mientras se asientan los hábitos. Es para pymes de 10 a 100 personas que quieren que su equipo use la IA con seguridad y le saque partido, no solo que haya oído hablar de ella. Un taller cuesta ${formatPrice('es', workshop)} y la mentoría, ${formatPrice('es', mentoring)}, IVA no incluido, y el taller suele poder hacerse entre dos y cuatro semanas después de acordar el contenido.`,
  },
  facts: {
    who: 'Pymes de 10 a 100 personas que quieren que su equipo use bien la IA, de la dirección a la primera línea',
    // TODO(albert): confirm the formats
    timeline: 'Talleres de media jornada a dos días; mentoría mes a mes',
    start:
      'Una llamada de 30 minutos para acordar los temas, los procesos con los que trabajaremos y quién asiste',
  },
  cta: {
    title: 'Planifica un taller para tu equipo',
    text: 'Cuéntanos cuántas personas sois, qué equipos y a qué dedican el día. Te respondemos con una propuesta de programa y un precio cerrado.',
    button: 'Pregunta por un taller',
  },
  useCases: {
    eyebrow: 'Qué cubre la formación',
    title: {
      before: 'Lo que tu equipo ',
      emphasis: 'usará el lunes',
      after: '',
    },
    items: [
      {
        id: 'foundations',
        title: 'Cómo se comportan de verdad las herramientas de IA',
        text: 'En qué aciertan y en qué fallan los modelos actuales, por qué se inventan cosas y cómo revisar su trabajo, para confiar en ellos lo justo.',
      },
      {
        id: 'own-work',
        title: 'Los procesos de tu equipo, en directo',
        text: 'Trabajamos con tareas reales del equipo, como correos, informes, propuestas o limpieza de datos, y cada persona se lleva instrucciones y flujos que puede reutilizar.',
      },
      {
        // TODO(albert): legal review of the AI Act article 4 sentence
        id: 'safe-use',
        title: 'Uso seguro',
        text: 'Qué datos pueden ir a cada herramienta, qué implica el RGPD, qué pide el artículo 4 del Reglamento Europeo de IA sobre la formación del personal y una política de uso breve que el equipo pueda cumplir.',
      },
      {
        id: 'leaders',
        title: 'Para la dirección',
        text: 'Dónde compensa la IA en tu negocio, qué automatizar y para qué formar a las personas, y cómo medir el resultado.',
      },
    ],
  },
  how: {
    eyebrow: 'Cómo trabajamos',
    title: {
      before: 'De un taller a ',
      emphasis: 'hábitos que se quedan',
      after: '',
    },
    steps: [
      {
        id: 'prepare',
        label: 'Preparar',
        text: 'Antes del taller recogemos algunas tareas reales de cada equipo y acordamos qué herramientas permite tu empresa.',
      },
      {
        // TODO(albert): where can workshops be held in person?
        id: 'workshop',
        label: 'Taller',
        text: 'Sesiones prácticas, presenciales u online, en las que cada persona trabaja sobre sus propias tareas en lugar de ver diapositivas.',
      },
      {
        id: 'practise',
        label: 'Practicar',
        text: 'Cada persona sale con una lista corta de tareas que pasar a la IA esa misma semana y un sitio donde compartir lo que funciona.',
      },
      {
        id: 'mentoring',
        label: 'Mentoría',
        text: 'Con la mentoría mensual revisamos lo que ha construido el equipo, ayudamos cuando alguien se atasca y actualizamos la política a medida que cambian las herramientas.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Caso',
    title: {
      before: 'Cómo trabaja con IA ',
      emphasis: 'nuestro propio equipo',
      after: '',
    },
    text: 'En Viatsy y Taplany, la IA redacta cada día la primera versión de respuestas, propuestas y contenidos de la web, y una persona la revisa antes de que salga. La formación se basa en esas mismas rutinas.',
    points: [
      'Respuestas redactadas por la IA, revisadas y enviadas por una persona',
      'Contenidos de la web redactados y verificados antes de publicarse',
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'formación en IA',
      after: '',
    },
    items: [
      {
        id: 'training-who',
        question: '¿Quién debería asistir?',
        answer:
          'Cualquiera que escriba, analice o responda como parte de su trabajo, que en una oficina es casi todo el mundo. Solemos hacer una sesión para la dirección y una o dos para los equipos, agrupados por tipo de trabajo para que los ejemplos encajen.',
      },
      {
        id: 'training-technical',
        question: '¿Hacen falta conocimientos técnicos?',
        answer:
          'No. El taller no da por sabido nada más allá de las herramientas de oficina de siempre. Para los perfiles más técnicos hay un bloque extra sobre automatizar con IA y conectarla con tus sistemas.',
      },
      {
        id: 'training-tools',
        question: '¿Con qué herramientas de IA trabajáis en la formación?',
        answer:
          'Con las que tu empresa permite o está valorando, como ChatGPT, Claude, Gemini o Microsoft Copilot. Lo aprendido sirve para cualquiera de ellas y, si tu empresa aún no ha elegido, te ayudamos a hacerlo.',
      },
      {
        id: 'training-policy',
        question: '¿Nos ayudáis a redactar una política de uso de la IA?',
        answer:
          'Sí. La redactamos contigo, breve: qué herramientas están aprobadas, qué datos no deben entrar nunca, cuándo tiene que revisar el resultado una persona y a quién preguntar. Está escrita para leerse, no para archivarse.',
      },
    ],
  },
  related: ['agents', 'automation'],
} satisfies ServicePageContent;
