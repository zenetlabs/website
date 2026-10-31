// TODO(albert): review every claim; the REAV sentence needs the asesoría's wording
import { services } from '@/content/es/services';
import type { SectorPageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const agent = formatPriceSummary('es', services.agent.prices);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const travelAgencies = {
  meta: {
    metaTitle: 'Automatización para agencias de viajes | Zenet Labs',
    description:
      'Automatizamos el trabajo repetitivo de una agencia de viajes: consultas, propuestas, confirmaciones de proveedores, cobros y documentación del viaje.',
  },
  hero: {
    eyebrow: 'Sectores · Agencias de viajes',
    title: {
      before: 'Automatización para agencias de viajes: menos tiempo ',
      emphasis: 'copiando reservas',
      after: '',
    },
    lead: `Una agencia de viajes dedica buena parte del día a trabajo repetitivo: contestar consultas por WhatsApp y correo, montar propuestas, pedir y copiar confirmaciones de proveedores, cobrar señales y recordar pagos, facturar y preparar la documentación del viaje. Automatizamos esos pasos sobre las herramientas que ya usas, con agentes de IA que preparan el trabajo y una persona que lo aprueba. Lo sabemos porque lo hacemos en Viatsy, nuestra propia agencia. Un proyecto cuesta ${price} y un agente de IA en producción, ${agent}, IVA no incluido.`,
  },
  facts: {
    // TODO(albert): confirm the agency size we serve
    who: 'Agencias minoristas, receptivas y organizadores de viajes en grupo que trabajan entre el correo, WhatsApp, Excel y las webs de los proveedores',
    // TODO(albert): confirm the timeline
    timeline:
      'De 4 a 8 semanas hasta la primera automatización, tras un diagnóstico de 1 a 2 semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Cuéntanos cómo trabaja tu agencia',
    text: 'Dinos qué tareas se comen más horas y con qué proveedores y herramientas trabajas. En el diagnóstico te decimos qué se puede automatizar y cuánto cuesta.',
    button: 'Reserva un diagnóstico',
  },
  work: {
    eyebrow: 'Qué automatizamos',
    title: {
      before: 'Del trabajo manual ',
      emphasis: 'a lo que se hace solo',
      after: '',
    },
    lead: 'Cada agencia trabaja a su manera; estas son las tareas que más horas se comen.',
    todayLabel: 'Hoy',
    automatedLabel: 'Automatizado',
    items: [
      {
        id: 'enquiries',
        title: 'Consultas',
        today:
          'Llegan por WhatsApp, correo, Instagram y la web, y alguien las copia a una hoja para no perderlas.',
        automated:
          'Todas entran en una sola bandeja con el cliente identificado, y un agente prepara un primer borrador de respuesta con los datos del viaje para que una persona lo revise y lo envíe.',
      },
      {
        id: 'proposals',
        title: 'Propuestas y presupuestos',
        today:
          'Cada propuesta se monta a mano, copiando itinerarios, hoteles y precios de presupuestos anteriores.',
        automated:
          'Un agente redacta la propuesta a partir de lo que pide el cliente y de tu catálogo, con tus reglas de precios, y tú solo la ajustas.',
      },
      {
        id: 'suppliers',
        title: 'Reservas y confirmaciones de proveedores',
        today:
          'Las confirmaciones de hoteles, vuelos, traslados y actividades llegan por correo o en PDF y se copian a mano en la reserva.',
        automated:
          'Cada confirmación se lee y se añade a la reserva, y el sistema avisa de lo que falta o no cuadra, como un nombre mal escrito o una fecha distinta.',
      },
      {
        id: 'payments',
        title: 'Cobros y facturación',
        today:
          'Se calcula a mano cuándo pedir la señal y el resto, y las facturas se hacen una a una.',
        // TODO(albert): REAV wording from the asesoría
        automated:
          'Las solicitudes de pago y sus recordatorios salen según el calendario de cada reserva, y las facturas se crean en tu programa de facturación con el régimen que indique tu asesoría, sea el especial de agencias de viajes o el general.',
      },
      {
        id: 'documents',
        title: 'Documentación del viaje',
        today:
          'Bonos, horarios, contactos y condiciones se juntan en un documento a última hora.',
        automated:
          'La documentación se monta con los datos de la reserva y, antes de enviarla, se comprueba que no falte nada.',
      },
      {
        id: 'travel',
        title: 'Comunicación durante el viaje',
        today:
          'Los avisos de salida, los cambios de horario y las preguntas del viaje se llevan de memoria.',
        automated:
          'Los avisos salen solos en su momento por WhatsApp o correo, y las respuestas del cliente llegan a su reserva.',
      },
    ],
  },
  platform: {
    title: '¿Prefieres una plataforma ya hecha?',
    text: 'Con lo que aprendimos en Viatsy creamos Taplany, un software para agencias de viajes que reúne web, consultas, propuestas, reservas, pagos y WhatsApp en un solo sitio. Si encaja contigo, te lo diremos; si necesitas conectar lo que ya usas, lo hacemos a medida.',
    link: 'Conoce Taplany',
  },
  case: {
    eyebrow: 'Caso',
    title: {
      before: 'Cómo trabaja ',
      emphasis: 'Viatsy',
      after: ' con agentes de IA',
    },
    text: 'Viatsy organiza viajes en grupo reducido a Asia. Los agentes preparan respuestas, propuestas, confirmaciones y cobros, y el equipo aprueba cada paso. Te contamos qué construimos y cómo funciona en el día a día.',
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas de ',
      emphasis: 'agencias de viajes',
      after: '',
    },
    items: [
      {
        id: 'travel-agencies-suppliers',
        question:
          '¿Funciona con mi programa de gestión y con los bancos de camas que uso?',
        answer:
          'Depende de si tienen API o una exportación fiable. Muchos programas de gestión para agencias, bancos de camas y plataformas de actividades la tienen; otros solo envían correos o PDF, y entonces leemos esos documentos. En el diagnóstico revisamos tus proveedores uno por uno.',
      },
      {
        id: 'travel-agencies-traveller-data',
        question:
          '¿Qué pasa con los datos de los viajeros, como los pasaportes?',
        answer:
          'Son datos personales, y algunos, como las necesidades médicas o de dieta, están especialmente protegidos. Por eso los tratamos lo mínimo: se guardan en tus sistemas, solo los ve quien los necesita y los proveedores de IA que usamos no entrenan con ellos. Antes de empezar firmamos un contrato de encargado del tratamiento.',
      },
      {
        id: 'travel-agencies-human',
        question: '¿Los agentes contestan solos a los clientes?',
        answer:
          'No, salvo que tú lo decidas. En Viatsy los agentes preparan las respuestas y una persona las revisa antes de enviarlas. Empezamos siempre así y solo dejamos que algo salga sin revisión cuando ha demostrado funcionar, como los recordatorios de pago.',
      },
      {
        id: 'travel-agencies-small',
        question: 'Somos una agencia pequeña. ¿Nos compensa?',
        answer: `Suele compensar a partir de unas pocas reservas a la semana, cuando el trabajo administrativo ya ocupa horas de alguien. El diagnóstico (${diagnostic}) mide cuánto tiempo se va en cada tarea y te dice con franqueza si automatizarla compensa o no.`,
      },
    ],
  },
  related: ['viatsyCase', 'automation', 'agents', 'integrations'],
} satisfies SectorPageContent;
