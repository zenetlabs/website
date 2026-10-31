// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const automation = {
  meta: {
    metaTitle: 'Automatización de procesos para pymes | Zenet Labs',
    description:
      'Automatizamos los pasos manuales de tus procesos, de documentos y aprobaciones a recordatorios e informes, con IA donde aporta. Para pymes.',
  },
  hero: {
    eyebrow: 'Servicios · Automatización de procesos',
    title: {
      before: 'Automatización de procesos para lo que tu equipo ',
      emphasis: 'aún hace a mano',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `La automatización de procesos consiste en que un programa haga por ti los pasos repetitivos del trabajo: lee los documentos que llegan, pasa los datos de una herramienta a otra y envía los mensajes rutinarios, y avisa a una persona cuando algo no cuadra. La montamos para pymes de 10 a 100 personas, sobre las herramientas que ya usan. Un proyecto cuesta ${price}, IVA no incluido, y la primera automatización suele estar funcionando entre cuatro y ocho semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Empresas de 10 a 100 personas que pasan datos a mano entre el programa de facturación, la tienda, el CRM, el correo y Excel',
    // TODO(albert): confirm the timeline
    timeline:
      'De 4 a 8 semanas hasta la primera automatización en producción, tras un diagnóstico de 1 a 2 semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Descubre qué puedes automatizar',
    text: 'Cuéntanos qué proceso se come más horas. El diagnóstico lo analiza, le pone precio y te dice con franqueza si automatizarlo compensa.',
    button: 'Reserva un diagnóstico',
  },
  useCases: {
    eyebrow: 'Qué automatizamos',
    title: {
      before: 'Procesos que ',
      emphasis: 'funcionan solos',
      after: ' una vez montados',
    },
    items: [
      {
        id: 'documents',
        title: 'De documentos a datos',
        text: 'La IA lee facturas de proveedores, albaranes y formularios, los compara con lo que esperabas y los archiva. A una persona solo le llegan las excepciones.',
      },
      {
        id: 'approvals',
        title: 'Aprobaciones',
        text: 'Compras, descuentos y devoluciones siguen un único circuito: la persona adecuada aprueba desde el correo o el chat y la decisión queda registrada donde toca.',
      },
      {
        id: 'follow-ups',
        title: 'Seguimientos y recordatorios',
        text: 'Presupuestos, recordatorios de cobro y avisos de renovación salen a su hora, por correo o WhatsApp, y se detienen en cuanto el cliente responde o paga.',
      },
      {
        id: 'reports',
        title: 'Informes',
        text: 'El informe semanal de ventas, tesorería u operaciones se monta solo a partir de tus sistemas y te llega al correo, en lugar de ocupar la mañana del lunes de alguien.',
      },
    ],
  },
  how: {
    eyebrow: 'Cómo trabajamos',
    title: { before: 'De un proceso a ', emphasis: 'muchos', after: '' },
    steps: [
      {
        id: 'map',
        label: 'Analizar',
        text: 'En el diagnóstico seguimos el proceso con quien lo hace, contamos las horas y elegimos qué pasos conviene automatizar primero.',
      },
      {
        id: 'build',
        label: 'Construir',
        text: 'Montamos la primera automatización en tus cuentas, con avisos y reintentos para cuando una herramienta falla o los datos no cuadran.',
      },
      {
        id: 'run',
        label: 'Probar en paralelo',
        text: 'Funciona junto a tu equipo unas semanas. Comparamos resultados y corregimos lo que salga con los datos reales.',
      },
      {
        id: 'extend',
        label: 'Ampliar',
        text: 'Cuando responde bien, pasamos al siguiente proceso, y puedes elegir un plan de mantenimiento para que siga funcionando.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Caso',
    title: {
      before: 'Cómo gestiona ',
      emphasis: 'Viatsy',
      after: ' las confirmaciones de proveedores',
    },
    text: 'Viatsy organiza viajes en grupo reducido a Asia, y cada viaje depende de muchas reservas con proveedores. Antes, cada confirmación se copiaba a mano en la reserva; ahora entra sola y una persona solo revisa lo que no cuadra.',
    points: [
      'Las confirmaciones de proveedores se leen y se añaden a la reserva',
      'La documentación del viaje se monta a partir de esas confirmaciones',
      'Las solicitudes de pago y los recordatorios salen a su debido tiempo',
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'automatización de procesos',
      after: '',
    },
    items: [
      {
        id: 'automation-first-processes',
        question: '¿Qué procesos conviene automatizar primero?',
        answer:
          'Los que se repiten a menudo, siguen casi siempre los mismos pasos y se comen horas cada semana: meter pedidos o facturas, reclamar cobros, preparar informes. El trabajo poco frecuente o que exige criterio suele quedarse mejor en manos de personas. El diagnóstico ordena tus procesos según las horas que ahorrarían frente a lo que cuesta montarlos.',
      },
      {
        // TODO(albert): confirm Zapier, Make and n8n
        id: 'automation-no-code-tools',
        question: '¿No podemos hacerlo nosotros con Zapier o Make?',
        answer:
          'Muchas veces sí, para flujos sencillos de dos pasos, y te lo diremos cuando baste con eso. Entramos cuando un proceso cruza varias herramientas, necesita IA para leer documentos o mensajes, o tiene que gestionar errores y excepciones sin fallar. Cuando encaja, lo montamos sobre Zapier, Make o n8n para que tu equipo pueda seguir modificándolo.',
      },
      {
        id: 'automation-where-ai',
        question: '¿Dónde entra la IA y dónde no?',
        answer:
          'La IA se encarga de los pasos que exigen leer o decidir, como sacar los datos de una factura en PDF o saber a qué departamento va un correo. Todo lo demás lo hacen reglas fijas, que son más baratas y predecibles. Cada paso con IA tiene un control de confianza y, si hay dudas, pasa a una persona.',
      },
      {
        id: 'automation-jobs',
        question: '¿Esto sustituye a personas del equipo?',
        answer:
          'Sustituye tareas, no puestos. Las horas que se liberan suelen ir a trabajo que necesita a una persona: clientes, proveedores, excepciones. Diseñamos cada automatización con quienes hacen hoy ese trabajo, y son ellos quienes deciden cuándo está lista.',
      },
    ],
  },
  related: ['integrations', 'agents'],
} satisfies ServicePageContent;
