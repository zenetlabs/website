// TODO(albert): review this page: timelines, the plugin comparison, every Holded/PrestaShop API claim (re-check holded.com/developers before deploy)
import { syncColumns } from '@/content/es/holded-pairs/columns';
import { services } from '@/content/es/services';
import type { HoldedPairContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const holdedPrestashop = {
  meta: {
    metaTitle: 'Integración de Holded con PrestaShop | Zenet Labs',
    description:
      'Conectamos PrestaShop con Holded para que pedidos, clientes, devoluciones y stock pasen solos y cada venta tenga su factura, sin teclear nada dos veces.',
  },
  hero: {
    eyebrow: 'Integraciones · Holded y PrestaShop',
    title: {
      before: 'Integración de Holded con PrestaShop: ',
      emphasis: 'cada pedido, su factura',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `Conectamos tu tienda PrestaShop con Holded para que cada pedido llegue como factura o ticket, con su cliente, sus impuestos y su forma de pago, y para que el stock cuadre en los dos lados. Los pedidos llegan a Holded en cuanto cambian de estado, las devoluciones se convierten en facturas rectificativas y las facturas se emiten en Holded, no en la tienda. Un proyecto cuesta ${price}, IVA no incluido, y suele estar funcionando entre tres y cinco semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Tiendas PrestaShop que facturan con Holded y todavía pasan pedidos, devoluciones o stock a mano, o a las que el plugin oficial se les queda corto',
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
        direction: 'De PrestaShop a Holded',
        when: 'En cuanto el pedido pasa al estado que elijas, por ejemplo «Pago aceptado»',
      },
      {
        id: 'customers',
        data: 'Clientes, con NIF y dirección de facturación',
        direction: 'De PrestaShop a Holded',
        when: 'Con su primer pedido; si ya existen, se reutilizan',
      },
      {
        id: 'refunds',
        data: 'Devoluciones y reembolsos, como factura rectificativa',
        direction: 'De PrestaShop a Holded',
        when: 'Al registrarse la devolución',
      },
      {
        id: 'stock',
        data: 'Stock por referencia (SKU)',
        direction: 'De Holded a PrestaShop, o en los dos sentidos',
        when: 'Cada vez que cambia en Holded',
      },
      {
        id: 'payments',
        data: 'Cobros',
        direction: 'De PrestaShop a Holded',
        when: 'Con el pedido, con su forma de pago',
      },
      {
        id: 'products',
        data: 'Productos nuevos',
        direction: 'De PrestaShop a Holded',
        when: 'Al darlos de alta en la tienda',
      },
    ],
    // TODO(albert): re-check on holded.com/developers before deploy
    note: 'PrestaShop no envía avisos (webhooks) de serie: instalamos un módulo pequeño que avisa al momento o, si tu alojamiento no lo permite, consultamos su API cada pocos minutos. Holded sí avisa con webhooks cuando cambia el stock o se registra un cobro.',
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
        id: 'no-sku',
        title: 'Productos sin referencia',
        text: 'El plugin oficial solo sincroniza productos simples y con variantes, todos con SKU. Los packs, los productos personalizables o las referencias repetidas necesitan una regla propia, que dejamos escrita antes de conectar nada.',
      },
      {
        id: 'partial-refunds',
        title: 'Devoluciones parciales',
        text: 'Si se devuelve una sola línea o solo los gastos de envío, la rectificativa es por ese importe y queda enlazada a la factura original, sin anular la venta entera.',
      },
      {
        id: 'invoice-type',
        title: 'Factura o ticket',
        // TODO(albert): asesoría check
        text: 'Si el cliente da su NIF, recibe una factura completa a su nombre; si no, un ticket (factura simplificada), dentro de los límites que marca la normativa. Cada tipo puede ir con su propia serie.',
      },
      {
        id: 'taxes',
        title: 'Ventas a otros países',
        text: 'Los pedidos de clientes de otros países de la UE o de Canarias llevan impuestos distintos. Fijamos con quien lleve tu contabilidad qué impuesto de Holded corresponde a cada caso, en lugar de dejar que la integración lo adivine.',
      },
      {
        id: 'double-invoices',
        title: 'Facturas por partida doble',
        text: 'Si tu PrestaShop ya genera facturas, hay que decidir cuál es la de verdad: dos programas numerando la misma venta acaban en facturas duplicadas. Normalmente la emite Holded y la tienda solo envía el PDF al cliente.',
      },
      {
        id: 'api-quota',
        title: 'Límites de la API de Holded',
        // TODO(albert): re-check the limits per plan on holded.com/developers
        text: 'Holded limita las llamadas a su API según tu plan, por minuto y por mes. En el diagnóstico calculamos cuántas necesita tu volumen de pedidos y te decimos si tu plan llega.',
      },
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'Holded y PrestaShop',
      after: '',
    },
    items: [
      {
        id: 'holded-prestashop-plugin',
        question:
          '¿Por qué no usar el plugin oficial de Holded para PrestaShop?',
        // TODO(albert): confirm the plugin's current refund handling
        answer:
          'Úsalo si cubre tu caso: es la opción más barata. El plugin importa los pedidos como factura, ticket o pedido de venta, crea los clientes y puede sincronizar el stock en los dos sentidos. Montamos una integración a medida cuando tu caso se sale de lo que hace: productos sin SKU o personalizables, reglas distintas por tipo de cliente o por tienda, o devoluciones que deben llegar como facturas rectificativas.',
      },
      {
        id: 'holded-prestashop-versions',
        question: '¿Funciona con mi versión de PrestaShop?',
        // TODO(albert): confirm the supported versions
        answer:
          'Trabajamos con PrestaShop 1.7, 8 y 9 a través de su API (el webservice) y, cuando hace falta, de un módulo propio. Si tu tienda usa módulos que cambian el proceso de pedido o el stock, los revisamos en el diagnóstico para que la integración respete sus datos.',
      },
      {
        id: 'holded-prestashop-multistore',
        question: '¿Y si tengo varias tiendas o vendo también en marketplaces?',
        answer:
          'Cada tienda se conecta por separado y puede tener su propia serie de facturación en Holded, para que sepas qué se vendió y dónde. Si además vendes en Amazon u otros marketplaces, los pedidos pueden llegar con su canal de venta indicado; lo vemos caso a caso en el diagnóstico.',
      },
      {
        id: 'holded-prestashop-verifactu',
        question: '¿Con esta integración ya cumplo Verifactu?',
        answer:
          'Ayuda, porque las facturas pasan a emitirse en Holded y no en la tienda. Pero Verifactu afecta a cualquier programa con el que factures, así que en el diagnóstico revisamos también los demás, como un TPV, un CRM o un programa antiguo que siga emitiendo facturas.',
      },
    ],
  },
  related: ['integrations', 'holdedWoocommerce', 'holdedHubspot', 'verifactu'],
} satisfies HoldedPairContent;
