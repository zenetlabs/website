// TODO(albert): review this page: timelines, the plugin comparison, every Holded/WooCommerce API claim (re-check holded.com/developers before deploy)
import { syncColumns } from '@/content/es/holded-pairs/columns';
import { services } from '@/content/es/services';
import type { HoldedPairContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const holdedWoocommerce = {
  meta: {
    metaTitle: 'Integración de Holded con WooCommerce | Zenet Labs',
    description:
      'Conectamos WooCommerce con Holded: cada pedido llega como factura con su cliente, los reembolsos como rectificativas y el stock se mantiene al día.',
  },
  hero: {
    eyebrow: 'Integraciones · Holded y WooCommerce',
    title: {
      before: 'Integración de Holded con WooCommerce: ',
      emphasis: 'la tienda y la contabilidad, al día',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `Conectamos WooCommerce con Holded para que cada pedido llegue como factura o ticket con su cliente, los reembolsos como facturas rectificativas y el stock de Holded se refleje en la tienda. WooCommerce avisa de cada pedido al momento, así que nadie tiene que exportar ni importar nada. Un proyecto cuesta ${price}, IVA no incluido, y suele estar funcionando entre tres y cinco semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Tiendas WooCommerce que facturan con Holded y todavía pasan pedidos, reembolsos o stock a mano, o a las que el plugin oficial se les queda corto',
    // TODO(albert): confirm the timeline
    timeline: 'De 3 a 5 semanas, tras un diagnóstico de 1 a 2 semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Cuéntanos cómo vende tu tienda',
    text: 'Dinos cuántos pedidos tienes al mes, qué plan de Holded usas y qué sigue haciéndose a mano. En el diagnóstico confirmamos qué se puede conectar y cuánto cuesta.',
    button: 'Reserva un diagnóstico',
  },
  sync: {
    eyebrow: 'Qué se sincroniza',
    title: {
      before: 'Qué pasa de ',
      emphasis: 'una herramienta a otra',
      after: '',
    },
    lead: 'Este es el punto de partida habitual. En el diagnóstico decidimos contigo qué herramienta manda en cada dato.',
    columns: syncColumns,
    rows: [
      {
        id: 'orders',
        data: 'Pedidos, como factura, ticket o pedido de venta',
        direction: 'De WooCommerce a Holded',
        when: 'Al momento, cuando el pedido pasa a «Procesando» o «Completado»',
      },
      {
        id: 'customers',
        data: 'Clientes, con NIF si tu tienda lo pide',
        direction: 'De WooCommerce a Holded',
        when: 'Con su primer pedido; si ya existen, se reutilizan',
      },
      {
        id: 'refunds',
        data: 'Reembolsos, como factura rectificativa',
        direction: 'De WooCommerce a Holded',
        when: 'Al registrarse el reembolso',
      },
      {
        id: 'stock',
        data: 'Stock por SKU',
        direction: 'De Holded a WooCommerce, o en los dos sentidos',
        when: 'Cada vez que cambia en Holded',
      },
      {
        id: 'payments',
        data: 'Cobros',
        direction: 'De WooCommerce a Holded',
        when: 'Con el pedido, con su forma de pago',
      },
      {
        id: 'products',
        data: 'Productos nuevos',
        direction: 'De WooCommerce a Holded',
        when: 'Al publicarlos en la tienda',
      },
    ],
    // TODO(albert): re-check on holded.com/developers before deploy
    note: 'WooCommerce envía un aviso (webhook) con cada pedido nuevo o cada cambio de estado, y Holded hace lo mismo cuando cambia el stock o entra un cobro. Además, una revisión cada noche compara los dos lados y recupera lo que se haya quedado por el camino.',
  },
  edgeCases: {
    eyebrow: 'Casos límite',
    title: {
      before: 'Lo que resolvemos ',
      emphasis: 'antes de activarla',
      after: '',
    },
    items: [
      {
        id: 'nif',
        title: 'El NIF del cliente',
        text: 'WooCommerce no pide el NIF de serie: hace falta un campo o un plugin en el pago. Sin él, la venta solo puede ir como ticket; con él, la integración crea la factura completa a nombre de la empresa.',
      },
      {
        id: 'partial-refunds',
        title: 'Reembolsos parciales',
        text: 'WooCommerce no envía un aviso propio para los reembolsos, así que la integración los detecta en los cambios del pedido y crea la rectificativa solo por lo devuelto, sea una línea, una parte o el envío.',
      },
      {
        id: 'warehouses',
        title: 'Varios almacenes',
        text: 'WooCommerce lleva un solo stock por producto. Si en Holded tienes varios almacenes, acordamos cuál alimenta la tienda o si se suma el de varios.',
      },
      {
        id: 'variations',
        title: 'Variaciones y productos sin SKU',
        text: 'Tallas, colores y packs se emparejan por SKU. Antes de activar nada repasamos el catálogo y marcamos los productos sin referencia o con la referencia repetida.',
      },
      {
        id: 'double-invoices',
        title: 'Facturas por partida doble',
        text: 'Si usas un plugin de facturas en WooCommerce, hay que elegir cuál es la de verdad: dos programas numerando la misma venta acaban en facturas duplicadas. Normalmente la emite Holded y la tienda envía su PDF.',
      },
      {
        id: 'api-quota',
        title: 'Picos de pedidos',
        // TODO(albert): re-check the limits per plan on holded.com/developers
        text: 'Holded fija cuántas llamadas a su API admite tu plan cada minuto y cada mes. Calculamos cuántas consume tu volumen de pedidos, con margen para picos como el Black Friday, y te avisamos si hace falta otro plan.',
      },
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'Holded y WooCommerce',
      after: '',
    },
    items: [
      {
        id: 'holded-woocommerce-plugin',
        question:
          '¿Por qué no basta con el plugin oficial de Holded para WooCommerce?',
        // TODO(albert): confirm the plugin's current refund handling
        answer:
          'Si cubre tu caso, úsalo: sale más barato. El plugin importa los pedidos como borradores de factura, ticket o pedido de venta, crea los clientes y sincroniza productos y stock con algunas condiciones. Una integración a medida tiene sentido cuando quieres que las facturas salgan aprobadas según tus reglas, necesitas rectificativas parciales o tu catálogo no encaja con sus requisitos de SKU.',
      },
      {
        id: 'holded-woocommerce-subscriptions',
        question: '¿Funciona con suscripciones, reservas o productos a medida?',
        answer:
          'Sí, pero cada tipo de producto necesita su regla. Una renovación de suscripción, por ejemplo, genera su propia factura en Holded, y un pago a cuenta se factura cuando corresponda según te indique tu asesoría. Lo definimos en el diagnóstico con pedidos reales de tu tienda.',
      },
      {
        id: 'holded-woocommerce-downtime',
        question:
          '¿Qué pasa si la tienda o Holded no responden durante un rato?',
        answer:
          'Los avisos se reintentan, y la revisión de cada noche recupera lo que no haya llegado. WooCommerce desactiva un aviso que falla varias veces seguidas, así que la integración también vigila que siga activo y te avisa si se ha parado.',
      },
      {
        id: 'holded-woocommerce-hosting',
        question: '¿Hay que tocar el código de mi tienda?',
        answer:
          'Normalmente no. La integración usa la API de WooCommerce con una clave de acceso limitada y funciona fuera de tu WordPress, así que no ralentiza la tienda. Solo añadimos algo en la tienda si falta un dato, como el campo del NIF en el pago.',
      },
    ],
  },
  related: ['integrations', 'holdedPrestashop', 'holdedHubspot', 'verifactu'],
} satisfies HoldedPairContent;
