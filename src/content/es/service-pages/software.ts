// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.web.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const software = {
  meta: {
    metaTitle: 'Desarrollo de software a medida para pymes | Zenet Labs',
    description:
      'Desarrollo de software a medida para pymes: portales de clientes, herramientas internas y aplicaciones web conectadas a los sistemas que ya usas.',
  },
  hero: {
    eyebrow: 'Servicios · Software a medida',
    title: {
      before: 'Desarrollo de software a medida, ',
      emphasis: 'hecho según cómo trabajas',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `El software a medida es una aplicación web, un portal de clientes o una herramienta interna diseñada según tus procesos, en lugar de obligarte a adaptarlos al producto de otro. Lo desarrollamos para pymes de 10 a 100 personas cuando las herramientas estándar se quedan cortas, y lo conectamos con los sistemas que ya usas. Un proyecto cuesta ${price}, IVA no incluido, y la primera versión útil suele estar en manos de tu equipo entre ocho y doce semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Empresas cuyo trabajo ya no cabe en un Excel ni en una herramienta estándar, o cuyos clientes necesitan un portal propio',
    // TODO(albert): confirm the timeline
    timeline:
      'De 8 a 12 semanas hasta una primera versión en uso, y después entregas cada pocas semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Describe la herramienta que te gustaría tener',
    text: 'Cuéntanos qué está sorteando hoy tu equipo. En el diagnóstico vemos si conviene desarrollar, comprar o conectar, y cuánto costaría la primera versión.',
    button: 'Reserva un diagnóstico',
  },
  useCases: {
    eyebrow: 'Qué desarrollamos',
    title: {
      before: 'Software para lo que ',
      emphasis: 'ningún producto',
      after: ' resuelve',
    },
    items: [
      {
        id: 'portal',
        title: 'Portales de clientes',
        text: 'Un espacio donde tus clientes hacen pedidos, siguen sus reservas, descargan documentos y pagan, sin escribir a tu equipo.',
      },
      {
        id: 'internal',
        title: 'Herramientas internas',
        text: 'El sistema que sustituye al Excel que todos editan: presupuestos, planificación, stock o seguimiento de trabajos, con los permisos adecuados para cada puesto.',
      },
      {
        id: 'websites',
        title: 'Webs que trabajan',
        text: 'Webs rápidas, accesibles y fáciles de encontrar en buscadores, conectadas a tu CRM y a tus reservas para que las consultas lleguen completas.',
      },
      {
        id: 'ai-features',
        title: 'IA dentro de la herramienta',
        text: 'Búsqueda en tus propios documentos, respuestas redactadas o introducción automática de datos, integradas en la herramienta que tu equipo ya abre cada día.',
      },
    ],
  },
  how: {
    eyebrow: 'Cómo trabajamos',
    title: {
      before: 'Entregas pequeñas y ',
      emphasis: 'opiniones desde el principio',
      after: '',
    },
    steps: [
      {
        id: 'design',
        label: 'Diseñar con quien lo usará',
        text: 'Bocetamos las pantallas con las personas que van a usarlas y acordamos la primera versión: la más pequeña que de verdad sirva.',
      },
      {
        id: 'build',
        label: 'Desarrollar en ciclos cortos',
        text: 'Ves software funcionando cada una o dos semanas, en un entorno de pruebas con tus datos, y decides qué viene después.',
      },
      {
        id: 'launch',
        label: 'Lanzar en tus cuentas',
        text: 'Funciona en un alojamiento y unas cuentas a tu nombre, con copias de seguridad, monitorización de errores y accesos que controlas tú.',
      },
      {
        id: 'evolve',
        label: 'Evolucionar',
        text: 'Tras el lanzamiento lo seguimos mejorando con un plan de mantenimiento, o entregamos el código y la documentación a tus propios desarrolladores.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Caso',
    title: {
      before: '',
      emphasis: 'Taplany',
      after: ', nuestro propio software para agencias de viajes',
    },
    text: 'Taplany nació de las herramientas que creamos para gestionar Viatsy. Se convirtió en un producto para que otras agencias de viajes tengan en un mismo sitio su web, consultas, propuestas, reservas, pagos y WhatsApp.',
    points: [
      'Web, consultas, propuestas, reservas, pagos y WhatsApp en un solo producto',
      'IA integrada, como respuestas redactadas con el tono de cada agencia para que una persona las apruebe',
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'software a medida',
      after: '',
    },
    items: [
      {
        id: 'software-build-or-buy',
        question: '¿Nos conviene desarrollar a medida o comprar un producto?',
        answer:
          'Compra cuando un producto cubre casi todo lo que necesitas, y te lo diremos en el diagnóstico. Desarrolla cuando la herramienta que buscas no existe, cuando pagas varios productos para cubrir un solo proceso o cuando el software es parte de lo que te diferencia. A menudo la respuesta es mixta: una base estándar con una pieza a medida conectada.',
      },
      {
        // TODO(albert): confirm the stack and the hosts
        id: 'software-stack',
        question: '¿Qué tecnologías usáis?',
        answer:
          'Tecnologías conocidas y con buen soporte: TypeScript y React para la interfaz, bases de datos probadas y alojamiento en Cloudflare, AWS o Google Cloud según lo que necesites. Evitamos cualquier cosa que solo pudiéramos mantener nosotros, para que otro desarrollador pueda hacerse cargo del código.',
      },
      {
        id: 'software-handover',
        question:
          '¿Podrá hacerse cargo nuestro propio equipo técnico más adelante?',
        answer:
          'Sí. El código está en tu repositorio desde el primer día, con documentación, pruebas automáticas y un despliegue que tu equipo puede ejecutar. Si más adelante contratas desarrolladores, planificamos el traspaso con ellos.',
      },
      {
        id: 'software-changes',
        question: '¿Y si necesitamos cambios después del lanzamiento?',
        answer:
          'Los cambios pequeños entran en el plan de mantenimiento; las funciones nuevas grandes llevan su propio presupuesto cerrado. Como entregamos en pasos pequeños, añadir algo después no obliga a empezar de cero.',
      },
    ],
  },
  related: ['integrations', 'agents'],
} satisfies ServicePageContent;
