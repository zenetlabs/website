// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.agent.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);
const maintenance = formatPriceSummary('es', services.maintenance.prices);

export const agents = {
  meta: {
    metaTitle: 'Implementación de agentes de IA para empresas | Zenet Labs',
    description:
      'Implementamos agentes de IA que hacen trabajo real en tu empresa: clasifican consultas, redactan respuestas y leen documentos, con una persona al mando.',
  },
  hero: {
    eyebrow: 'Servicios · Agentes de IA',
    title: {
      before: 'Implementación de agentes de IA que ',
      emphasis: 'trabajan de verdad',
      after: ', con una persona al mando',
    },
    // TODO(albert): confirm the timeline
    lead: `Un agente de IA es un programa que lleva una tarea de principio a fin: lee una consulta o un documento, busca en tus sistemas lo que necesita, decide el siguiente paso y lo ejecuta, dentro de los límites que tú fijas. Implementamos agentes para pymes de 10 a 100 personas en tareas como clasificar consultas, redactar respuestas o procesar documentos, y una persona aprueba todo lo que tiene consecuencias. Un agente en producción cuesta ${price}, IVA no incluido, y el piloto suele estar trabajando con casos reales entre seis y diez semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Empresas con un flujo constante de consultas, documentos o peticiones que siguen patrones pero aún necesitan criterio',
    // TODO(albert): confirm the timeline
    timeline:
      'De 6 a 10 semanas hasta un piloto con casos reales; la puesta en producción llega cuando supera tus pruebas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Elige la primera tarea para un agente',
    text: 'Cuéntanos qué tarea se acumula cada día. En el diagnóstico comprobamos si un agente puede hacerla con fiabilidad y cuánto costaría montarlo y mantenerlo.',
    button: 'Reserva un diagnóstico',
  },
  useCases: {
    eyebrow: 'Qué hacen los agentes',
    title: {
      before: 'Tareas de las que un agente ',
      emphasis: 'puede encargarse',
      after: '',
    },
    items: [
      {
        id: 'triage',
        title: 'Clasificar consultas',
        text: 'Lee cada correo, formulario y mensaje de WhatsApp, entiende qué se pide y lo pasa con un resumen a la persona adecuada, o lo responde si la respuesta es rutinaria.',
      },
      {
        id: 'drafting',
        title: 'Respuestas y propuestas',
        text: 'Redacta respuestas y presupuestos con tu tono a partir de tu catálogo, tus precios y respuestas anteriores, para que alguien del equipo los revise y los envíe.',
      },
      {
        id: 'documents',
        title: 'Procesar documentos',
        text: 'Lee facturas, contratos, albaranes o solicitudes, extrae lo importante y lo contrasta con tus registros.',
      },
      {
        id: 'knowledge',
        title: 'Preguntas internas',
        text: 'Responde a las dudas del equipo sobre procedimientos, productos o casos anteriores a partir de los documentos de tu empresa, con enlace a la fuente.',
      },
    ],
  },
  how: {
    eyebrow: 'Cómo trabajamos',
    title: {
      before: 'Probado con ',
      emphasis: 'tus casos',
      after: ' antes de ponerlo en marcha',
    },
    steps: [
      {
        id: 'scope',
        label: 'Definir el trabajo',
        text: 'Acordamos qué puede hacer el agente por su cuenta, qué debe consultar y qué no debe hacer nunca.',
      },
      {
        id: 'tests',
        label: 'Preparar las pruebas',
        text: 'Reunimos casos reales del pasado con su respuesta correcta, para medir cada versión del agente antes de que nadie dependa de él.',
      },
      {
        id: 'pilot',
        label: 'Piloto con aprobación',
        text: 'El agente trabaja con casos reales mientras una persona aprueba cada acción. Lo ajustamos hasta que la tasa de aprobación demuestra que está listo.',
      },
      {
        id: 'production',
        label: 'Producción',
        text: 'Las acciones rutinarias salen solas; las que tienen consecuencias siguen esperando a una persona. Vigilamos uso, coste y errores, y cada acción queda registrada.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    page: 'viatsyCase',
    eyebrow: 'Caso',
    title: { before: 'Primeras respuestas en ', emphasis: 'Viatsy', after: '' },
    text: 'Viatsy recibe consultas de viaje por varios canales, y cada una necesita una respuesta a medida. Un agente redacta la primera respuesta y la propuesta, y el equipo las revisa antes de enviar nada.',
    points: [
      'Un primer borrador de respuesta para cada consulta, que una persona revisa y envía',
      'Propuestas redactadas a partir de lo que pide el cliente y del catálogo de viajes',
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'agentes de IA',
      after: '',
    },
    items: [
      {
        id: 'agents-vs-chatbot',
        question: '¿En qué se diferencia un agente de IA de un chatbot?',
        answer:
          'Un chatbot responde preguntas en una ventana de chat. Un agente trabaja en tus sistemas: lee la consulta, comprueba el stock o la reserva, redacta la respuesta o actualiza la ficha, y pasa el caso a una persona cuando toca. Muchos agentes ni siquiera hablan directamente con clientes.',
      },
      {
        // TODO(albert): confirm the data-access promises
        id: 'agents-data-access',
        question: '¿El agente ve todos nuestros datos?',
        answer:
          'Solo lo que necesita para su trabajo. Tiene su propio acceso con los permisos mínimos que funcionen, de solo lectura siempre que se pueda, y nunca ve contraseñas ni datos de tarjetas. Cada consulta y cada acción quedan registradas, así que puedes comprobar qué vio y por qué actuó.',
      },
      {
        id: 'agents-ready',
        question: '¿Cómo sabemos que un agente está listo para producción?',
        answer:
          'Por las cifras, no por una demo. Antes de lanzarlo tiene que superar las pruebas hechas con tus casos reales, y durante el piloto medimos cuántas veces una persona corrige o rechaza lo que propone. Tú fijas el umbral, y solo se pone en marcha cuando lo alcanza.',
      },
      {
        id: 'agents-running-costs',
        question: '¿Qué gastos tiene un agente una vez en marcha?',
        answer: `Hay dos partes: el uso del proveedor de IA, que depende del volumen, y, si quieres que lo vigilemos y lo ajustemos, un plan de mantenimiento (${maintenance}). Estimamos el uso en el diagnóstico y fijamos un tope de gasto mensual, para que la factura no te dé sustos.`,
      },
    ],
  },
  related: ['automation', 'training'],
} satisfies ServicePageContent;
