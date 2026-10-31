// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/es/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const integrations = {
  meta: {
    metaTitle: 'Integraciones con Holded, tienda online y CRM | Zenet Labs',
    description:
      'Conectamos Holded, PrestaShop, WooCommerce, HubSpot, WhatsApp y Excel para que pedidos, facturas y clientes pasen solos de una herramienta a otra.',
  },
  hero: {
    eyebrow: 'Servicios · Integraciones',
    title: {
      before: 'Integraciones para que tu ERP, tu tienda y tu CRM ',
      emphasis: 'se hablen',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `Una integración conecta dos o más de tus herramientas para que los datos pasen solos de una a otra: un pedido de PrestaShop se convierte en factura en Holded, una oportunidad ganada en HubSpot crea el cliente y la factura, un cobro actualiza el CRM. Las montamos para pymes de 10 a 100 personas cuyas herramientas no se hablan entre sí. Un proyecto cuesta ${price}, IVA no incluido, y una integración típica está funcionando entre tres y seis semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Empresas que trabajan a la vez con Holded, PrestaShop, WooCommerce, Shopify, HubSpot o WhatsApp Business, con alguien pasando datos de una a otra',
    // TODO(albert): confirm the timeline
    timeline:
      'De 3 a 6 semanas por integración, tras un diagnóstico de 1 a 2 semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Enséñanos qué herramientas usas',
    text: 'Dinos qué programas usáis y dónde se siguen copiando datos a mano. En el diagnóstico confirmamos qué se puede conectar y cuánto cuesta.',
    button: 'Reserva un diagnóstico',
  },
  useCases: {
    eyebrow: 'Integraciones habituales',
    title: {
      before: 'Las conexiones que ',
      emphasis: 'más montamos',
      after: '',
    },
    lead: 'También Shopify, Microsoft 365, Google Workspace, Excel y la mayoría de programas de facturación: si una herramienta tiene API o una exportación fiable, casi siempre podemos conectarla.',
    items: [
      {
        id: 'pair-1',
        title: 'Holded y PrestaShop',
        text: 'Cada pedido de PrestaShop entra en Holded como factura, con el cliente y el stock al día, sin volver a teclearlo.',
      },
      {
        id: 'pair-2',
        title: 'Holded y WooCommerce',
        text: 'Pedidos, devoluciones y cobros de WooCommerce llegan a Holded, para que la contabilidad cuadre con la tienda sin conciliar a mano a fin de mes.',
      },
      {
        id: 'pair-3',
        title: 'Holded y HubSpot',
        text: 'Una oportunidad ganada en HubSpot crea el contacto y la factura en Holded, y el estado del cobro vuelve a HubSpot para que ventas sepa quién ha pagado.',
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp Business y tus sistemas',
        text: 'Los avisos de pedido o de reserva salen por WhatsApp con tus propios datos, y las respuestas llegan a la ficha del cliente correcto.',
      },
    ],
  },
  how: {
    eyebrow: 'Cómo trabajamos',
    title: {
      before: 'Hechas para ',
      emphasis: 'aguantar datos reales',
      after: '',
    },
    steps: [
      {
        id: 'map',
        label: 'Mapear los datos',
        text: 'Listamos qué guarda cada herramienta, cuál manda en cada campo y qué debe pasar cuando dos registros no coinciden.',
      },
      {
        id: 'build',
        label: 'Montarla en tus cuentas',
        text: 'La integración funciona en cuentas a tu nombre, con registro de cada envío, avisos y reintentos automáticos cuando una API no responde.',
      },
      {
        id: 'test',
        label: 'Probar con registros reales',
        text: 'Antes de activarla repasamos una muestra de pedidos, oportunidades y facturas reales, y revisamos el resultado con quien lleva la contabilidad.',
      },
      {
        id: 'handover',
        label: 'Entregar',
        text: 'Te dejamos documentado cada campo y una guía breve para el equipo. Con un plan de mantenimiento, sigue funcionando cuando una herramienta cambia su API.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Caso',
    title: {
      before: 'Una sola línea de tiempo por reserva en ',
      emphasis: 'Taplany',
      after: '',
    },
    text: 'Taplany es la plataforma que creamos para agencias de viajes. Reúne en cada reserva los canales con los que trabaja la agencia, para que nadie tenga que saltar de una herramienta a otra para saber qué ha pasado.',
    points: [
      'WhatsApp, correo y enlaces de pago en la misma línea de tiempo que cada reserva',
      'Itinerarios y confirmaciones de proveedores pegados como texto, convertidos en reservas estructuradas',
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'integraciones',
      after: '',
    },
    items: [
      {
        id: 'integrations-ready-made-connectors',
        question: '¿Por qué no instalar un conector ya hecho?',
        answer:
          'Pruébalo primero si cubre tu caso: un conector ya hecho sale más barato. Los conectores suelen fallar en los detalles, como devoluciones parciales, campos personalizados, varias tiendas que alimentan la misma contabilidad o series de facturación distintas. Montamos una integración cuando el conector ya te ha costado más en arreglos de lo que te ahorraba.',
      },
      {
        id: 'integrations-conflicts',
        question: '¿Qué pasa cuando dos sistemas no coinciden?',
        answer:
          'Lo decidimos antes de construir. Cada campo tiene un sistema que manda, por ejemplo los precios en la tienda y el estado del cobro en Holded, y la integración nunca lo sobrescribe desde el otro lado. Si un registro no se puede emparejar, espera en una lista de revisión en lugar de adivinarse.',
      },
      {
        id: 'integrations-failures',
        question: '¿Y si una API se cae o una sincronización falla?',
        answer:
          'La integración reintenta sola y, si sigue fallando, guarda lo que no se ha enviado y avisa a la persona que elijas. No se pierde nada sin que lo sepas: cuando el servicio vuelve, lo pendiente se envía en orden.',
      },
      {
        id: 'integrations-existing-data',
        question: '¿Podéis pasar también los datos que ya tenemos?',
        answer:
          'Sí. Normalmente importamos el histórico que necesitas, como facturas pendientes, clientes activos o los pedidos del año, cuadramos los totales contigo y solo entonces activamos la sincronización.',
      },
    ],
  },
  related: ['automation', 'software'],
} satisfies ServicePageContent;
