// TODO(albert): review this page: timelines, the Zapier comparison, every Holded/HubSpot API claim (re-check holded.com/developers before deploy)
import { syncColumns } from '@/content/es/holded-pairs/columns';
import { services } from '@/content/es/services';
import type { HoldedPairContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);

export const holdedHubspot = {
  meta: {
    metaTitle: 'Integración de Holded con HubSpot | Zenet Labs',
    description:
      'Conectamos HubSpot con Holded: una oportunidad ganada crea el cliente y la factura, y el estado del cobro vuelve a HubSpot para que ventas lo vea.',
  },
  hero: {
    eyebrow: 'Integraciones · Holded y HubSpot',
    title: {
      before: 'Integración de Holded con HubSpot: ',
      emphasis: 'de la venta cerrada a la factura',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `Conectamos HubSpot con Holded para que, cuando ganas una oportunidad, el cliente se cree en Holded con sus datos fiscales y salga la factura o el presupuesto con sus líneas, y para que el estado del cobro vuelva a HubSpot. Así ventas ve quién ha pagado sin preguntar a administración, y administración no vuelve a teclear lo que ya está en el CRM. Un proyecto cuesta ${price}, IVA no incluido, y suele estar funcionando entre tres y cinco semanas después del diagnóstico.`,
  },
  facts: {
    who: 'Empresas que venden con HubSpot y facturan con Holded, con alguien pasando clientes, importes o cobros de uno a otro',
    // TODO(albert): confirm the timeline
    timeline: 'De 3 a 5 semanas, tras un diagnóstico de 1 a 2 semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Enséñanos tu proceso de venta',
    text: 'Cuéntanos por qué etapas pasa una oportunidad en HubSpot y quién factura en Holded. En el diagnóstico confirmamos qué se puede conectar y cuánto cuesta.',
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
        id: 'companies',
        data: 'Empresas y contactos, con NIF y dirección fiscal',
        direction: 'De HubSpot a Holded',
        when: 'Al ganar la oportunidad, o antes si lo prefieres',
      },
      {
        id: 'deals',
        data: 'Oportunidades ganadas, como factura, proforma o pedido de venta',
        direction: 'De HubSpot a Holded',
        when: 'Al momento, cuando la oportunidad pasa a «Ganada»',
      },
      {
        id: 'line-items',
        data: 'Líneas de producto, con cantidades, precios y descuentos',
        direction: 'De HubSpot a Holded',
        when: 'Con la oportunidad',
      },
      {
        id: 'payments',
        data: 'Estado del cobro y número de factura',
        direction: 'De Holded a HubSpot',
        when: 'Al momento, cuando se registra un cobro',
      },
      {
        id: 'products',
        data: 'Productos y precios del catálogo',
        direction: 'De Holded a HubSpot',
        when: 'Cada vez que cambian en Holded',
      },
    ],
    // TODO(albert): re-check on holded.com/developers before deploy
    note: 'Los dos lados avisan de los cambios con webhooks, así que todo va al momento. Una revisión diaria compara clientes y facturas para detectar lo que no haya cuadrado.',
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
        id: 'missing-tax-data',
        title: 'Oportunidades sin datos fiscales',
        text: 'Sin NIF ni dirección no hay factura completa. Si a una oportunidad ganada le faltan, la integración no inventa nada: la deja en una lista de revisión y avisa a quien tenga que completarla.',
      },
      {
        id: 'duplicates',
        title: 'Clientes duplicados',
        text: 'HubSpot y Holded suelen tener el mismo cliente escrito de dos formas. Emparejamos por NIF y, si no lo hay, por correo o dominio, y repasamos contigo los dudosos antes de activar la sincronización.',
      },
      {
        id: 'reopened',
        title: 'Ventas que se reabren',
        text: 'Si una oportunidad ganada vuelve atrás después de facturar, la factura no se borra: se avisa a administración para que emita una rectificativa si corresponde.',
      },
      {
        id: 'no-line-items',
        title: 'Oportunidades sin líneas',
        text: 'Una oportunidad con solo un importe total no dice qué se vende ni con qué impuesto. Proponemos usar líneas del catálogo, que llega desde Holded, o una línea genérica por servicio.',
      },
      {
        id: 'partial-payments',
        title: 'Cobros parciales y a plazos',
        text: 'Si el cliente paga en varias veces, HubSpot muestra lo cobrado y lo pendiente, no solo «pagada» o «no pagada», para que ventas sepa cuándo reclamar.',
      },
      {
        id: 'api-limits',
        title: 'Límites de las dos API',
        // TODO(albert): re-check the limits per plan on holded.com/developers
        text: 'HubSpot y Holded limitan las llamadas según el plan. Agrupamos las peticiones y calculamos el consumo con tu volumen real, para no quedarte sin cupo a mitad de mes.',
      },
    ],
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: {
      before: 'Preguntas sobre ',
      emphasis: 'Holded y HubSpot',
      after: '',
    },
    items: [
      {
        id: 'holded-hubspot-zapier',
        question: '¿No se puede hacer con Zapier?',
        answer:
          'Sí, para casos sencillos: Holded propone plantillas de Zapier para pasar contactos y crear oportunidades entre los dos. Se queda corto cuando hay que crear facturas con sus líneas e impuestos, emparejar clientes duplicados o devolver el estado del cobro, y cada paso suma tareas a tu plan de Zapier. Ahí compensa una integración propia.',
      },
      {
        id: 'holded-hubspot-quote',
        question: '¿Puede salir un presupuesto en vez de una factura?',
        answer:
          'Sí. Según la etapa de la oportunidad, la integración puede crear en Holded un presupuesto, una proforma o un pedido de venta, y convertirlo en factura cuando se cumple la condición que acordemos, por ejemplo la aceptación del cliente o el primer cobro.',
      },
      {
        id: 'holded-hubspot-plans',
        question: '¿Qué planes de HubSpot y de Holded necesito?',
        // TODO(albert): confirm API access per plan
        answer:
          'La integración usa las API estándar de HubSpot y de Holded, sin módulos de pago adicionales. Lo que sí importa es tu plan de Holded, que marca cuántas llamadas a su API puedes hacer cada mes; en el diagnóstico calculamos si el tuyo llega para tu volumen de ventas.',
      },
      {
        id: 'holded-hubspot-holded-crm',
        question: 'Holded ya tiene CRM. ¿Por qué mantener HubSpot?',
        answer:
          'Si tu equipo comercial ya trabaja en HubSpot, con sus secuencias, informes y automatizaciones, cambiar tiene un coste. Si solo usáis lo básico, quizá el CRM de Holded te baste y te ahorres la integración. Te lo diremos con franqueza en el diagnóstico.',
      },
    ],
  },
  related: [
    'integrations',
    'holdedPrestashop',
    'holdedWoocommerce',
    'verifactu',
  ],
} satisfies HoldedPairContent;
