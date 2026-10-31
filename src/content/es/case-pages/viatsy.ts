// TODO(albert): confirm every claim; the figures live in cases.ts as [X]
import type { CasePageContent } from '@/content/types';

export const viatsyCase = {
  meta: {
    metaTitle: 'Caso Viatsy: agentes de IA en una agencia | Zenet Labs',
    description:
      'Cómo Viatsy, nuestra agencia de viajes en grupo, lleva consultas, propuestas, reservas con proveedores y cobros con agentes de IA y una persona al mando.',
  },
  eyebrow: 'Caso · Viajes',
  title: {
    before: 'Viatsy, una agencia de viajes que ',
    emphasis: 'funciona con agentes de IA',
    after: '',
  },
  lead: 'Viatsy es una agencia de viajes nuestra. Organiza viajes en grupo reducido a Japón, China, Corea, Taiwán y Hong Kong, y cada viaje supone consultas por varios canales, una propuesta a medida y muchas reservas con proveedores. Construimos los sistemas que permiten a un equipo pequeño llevar todo ese trabajo: los agentes de IA preparan respuestas, propuestas, reservas y recordatorios de pago, y una persona aprueba cada paso que llega al cliente.',
  published: '2026-10-31',
  labels: { published: 'Publicado', updated: 'Actualizado' },
  facts: [
    {
      id: 'company',
      label: 'Empresa',
      value: 'Viatsy, viajes en grupo reducido a Asia (empresa propia)',
    },
    {
      id: 'built',
      label: 'Qué construimos',
      value:
        'Agentes y automatizaciones para consultas, propuestas, reservas, cobros y documentación del viaje',
    },
    {
      id: 'services',
      label: 'Servicios',
      value: 'Agentes de IA, automatización e integraciones',
    },
    {
      id: 'approach',
      label: 'Cómo funciona',
      value:
        'Los agentes preparan el trabajo; una persona aprueba todo lo que ve el cliente',
    },
  ],
  problem: {
    eyebrow: 'El problema',
    title: {
      before: 'Un equipo pequeño y ',
      emphasis: 'mucho copiar y pegar',
      after: '',
    },
    paragraphs: [
      'Un viaje en grupo a Asia son muchas tareas pequeñas. Las consultas llegan por WhatsApp, correo y la web, y cada una necesita una respuesta a medida. Una propuesta combina vuelos, hoteles, trenes, actividades y seguros. Y cuando el viaje se reserva, cada proveedor envía su confirmación con su propio formato, que tiene que llegar a la reserva, al plan de pagos y a la documentación del cliente.',
      'Hecho a mano, ese trabajo crece con cada reserva, y los errores son de los que el cliente nota: un nombre mal escrito, un bono que falta, un recordatorio que nunca salió.',
    ],
  },
  built: {
    eyebrow: 'Qué construimos',
    title: {
      before: 'Un solo sistema para ',
      emphasis: 'cada reserva',
      after: '',
    },
    items: [
      {
        id: 'inbox',
        title: 'Una bandeja para todos los canales',
        text: 'Las consultas de WhatsApp, correo y la web llegan al mismo sitio, vinculadas al cliente y al viaje por el que pregunta.',
      },
      {
        id: 'replies',
        title: 'Respuestas redactadas',
        text: 'Un agente redacta cada respuesta con los datos del viaje y las normas de la casa que ha escrito el equipo, y una persona la corrige y la envía. Lo que el equipo cambia queda registrado, y así los borradores mejoran.',
      },
      {
        id: 'proposals',
        title: 'Propuestas a partir de lo que pide el cliente',
        text: 'Las propuestas se redactan desde la petición del cliente y el catálogo de viajes, y el precio sale de reglas fijas, no del modelo.',
      },
      {
        id: 'confirmations',
        title: 'Confirmaciones de proveedores, leídas',
        text: 'Las confirmaciones pegadas como texto o reenviadas por correo se convierten en reservas estructuradas, y se marcan los huecos y lo que no cuadra.',
      },
      {
        id: 'payments',
        title: 'Cobros a su tiempo',
        text: 'Las solicitudes de la señal y del resto, y sus recordatorios, siguen el plan de pagos de cada reserva.',
      },
      {
        id: 'pack',
        title: 'Documentación del viaje',
        text: 'La documentación se monta desde la propia reserva, con una comprobación que lista lo que aún falta antes de enviarla.',
      },
    ],
  },
  operations: {
    eyebrow: 'Día a día',
    title: { before: 'Cómo trabajan ', emphasis: 'los agentes', after: '' },
    steps: [
      {
        id: 'enquiry',
        label: 'Consulta',
        text: 'Llega un mensaje. El agente identifica al cliente y el viaje y redacta una respuesta; una persona la revisa y la envía.',
      },
      {
        id: 'proposal',
        label: 'Propuesta',
        text: 'A partir de lo que pide el cliente, el agente redacta el itinerario y el precio sale de las reglas de precios. El equipo lo ajusta y lo envía.',
      },
      {
        id: 'booking',
        label: 'Reserva',
        text: 'Cuando el cliente acepta, se hacen las reservas con los proveedores y cada confirmación se incorpora a la reserva. El sistema avisa de lo que no cuadra.',
      },
      {
        id: 'trip',
        label: 'Antes y durante el viaje',
        text: 'Los recordatorios de pago y los avisos previos a la salida salen a su tiempo, y la documentación se revisa y se envía. Las respuestas del cliente llegan a su reserva.',
      },
    ],
  },
  results: {
    eyebrow: 'Resultados',
    title: { before: 'Qué ', emphasis: 'ha cambiado', after: '' },
    points: [
      'Nadie copia ya a mano las confirmaciones de proveedores en las reservas; una persona solo revisa lo que el sistema marca.',
      'Cada consulta tiene un primer borrador de respuesta, así que el equipo parte de una respuesta y no de una página en blanco.',
      'Las solicitudes de pago y los recordatorios ya no dependen de que alguien se acuerde.',
      'Lo que construimos para Viatsy se convirtió en Taplany, nuestro software para agencias de viajes.',
    ],
  },
  cta: {
    title: '¿Quieres lo mismo en tu empresa?',
    text: 'Cuéntanos qué trabajo se sigue comiendo las horas de tu equipo. El diagnóstico lo analiza, le pone precio y te dice con franqueza qué compensa automatizar.',
    button: 'Reserva un diagnóstico',
  },
  related: ['agents', 'automation', 'travelAgencies'],
} satisfies CasePageContent;
