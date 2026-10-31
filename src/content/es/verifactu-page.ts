// TODO(albert): legal review of the whole page; re-check the BOE (RD 1007/2023 consolidated text) and the AEAT before each deploy and bump verifactuDates.checkedOn and the verifactu lastmod
import { services } from '@/content/es/services';
import { verifactuDates } from '@/content/es/verifactu';
import type { VerifactuPageContent } from '@/content/types';
import { formatMoney, formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('es', row);
const diagnostic = formatPriceSummary('es', services.diagnostic.prices);
const {
  companies,
  others,
  announcedOn,
  announcedTo,
  producersFrom,
  checkedOn,
} = verifactuDates;

export const verifactuPage = {
  meta: {
    metaTitle: 'Integración con Verifactu para pymes | Zenet Labs',
    description:
      'Qué exige Verifactu, a quién y desde cuándo, y cómo hacemos que tu tienda, tu CRM o tu ERP facturen con un programa adaptado. Con fechas revisadas.',
  },
  hero: {
    eyebrow: 'Verifactu',
    title: {
      before: 'Integración con Verifactu: que tus ventas se facturen ',
      emphasis: 'con un programa adaptado',
      after: '',
    },
    // TODO(albert): confirm Holded shows its declaración responsable for the current version
    lead: `Verifactu es el reglamento (RD 1007/2023) que fija qué debe cumplir el programa con el que emites tus facturas: que cada factura deje un registro que no se pueda alterar y que lleve un código QR. Según la norma en vigor, las sociedades deben tenerlo adaptado antes del ${companies} y los autónomos y el resto, antes del ${others}; Hacienda ha anunciado que lo aplazará a ${announcedTo}, pero aún no está en el BOE. Te ayudamos a que tu tienda, tu CRM o tu ERP facturen a través de un programa adaptado, como Holded. El diagnóstico cuesta ${diagnostic} y un proyecto de integración, ${price}, IVA no incluido.`,
  },
  facts: {
    who: 'Sociedades, autónomos y demás negocios que facturan con un programa, sobre todo si las facturas salen de varios sitios: tienda, TPV, CRM o un programa propio',
    // TODO(albert): confirm the timeline
    timeline:
      'De 3 a 6 semanas por integración o migración, tras un diagnóstico de 1 a 2 semanas',
    start: `El diagnóstico de automatización (${diagnostic}), que se descuenta del proyecto si sigues adelante en 60 días`,
  },
  cta: {
    title: 'Revisemos cómo facturas hoy',
    text: 'Dinos desde dónde salen tus facturas: la tienda, el TPV, el CRM, el ERP o un programa propio. En el diagnóstico te decimos qué hay que cambiar para Verifactu y cuánto cuesta.',
    button: 'Reserva un diagnóstico',
  },
  deadlines: {
    eyebrow: 'Plazos',
    title: { before: 'Quién debe cumplir ', emphasis: 'y cuándo', after: '' },
    columns: { who: 'Quién', date: 'Fecha según la norma en vigor' },
    rows: [
      {
        id: 'companies',
        who: 'Contribuyentes del Impuesto sobre Sociedades',
        date: `antes del ${companies}`,
      },
      {
        id: 'others',
        who: 'El resto: autónomos con actividad económica, no residentes con establecimiento permanente y entidades en atribución de rentas, como las comunidades de bienes',
        date: `antes del ${others}`,
      },
    ],
    announced: `El ${announcedOn}, el Ministerio de Hacienda anunció en una nota que modificará el reglamento para que estas obligaciones se apliquen a partir de ${announcedTo}, a la vez que la factura electrónica obligatoria entre empresas. Hasta que esa modificación se publique en el BOE, las fechas que cuentan son las de la tabla.`,
    // TODO(albert): confirm the producers' date
    producers: `Los fabricantes de programas de facturación ya deben ofrecerlos adaptados desde el ${producersFrom}.`,
    exclusionsTitle: 'No te afecta si…',
    exclusions: [
      'Llevas los libros registro del IVA por el SII (Suministro Inmediato de Información).',
      'Tu domicilio fiscal está en el País Vasco o en Navarra y tributas con sus normas forales, que tienen sistemas propios, como TicketBAI en el País Vasco.',
      'No usas ningún programa para facturar: Verifactu regula los programas, no obliga a empezar a usar uno.',
    ],
    checked: `Fechas revisadas el ${checkedOn}.`,
  },
  requirements: {
    eyebrow: 'Requisitos',
    title: {
      before: 'Qué exige Verifactu a tu ',
      emphasis: 'programa de facturación',
      after: '',
    },
    lead: 'No es un trámite que hagas tú: lo cumple el programa. A ti te toca asegurarte de que el tuyo lo hace y de que todas tus facturas salen de él.',
    items: [
      {
        id: 'record',
        title: 'Un registro por factura',
        text: 'Al emitir cada factura, el programa genera un registro de facturación con sus datos principales. Si hay que corregirla o anularla, se añade otro registro: el anterior nunca se borra ni se modifica.',
      },
      {
        id: 'hash',
        title: 'Registros encadenados',
        text: 'Cada registro lleva una huella digital (hash) que incluye datos del anterior, de modo que cualquier hueco o cambio se detecta.',
      },
      {
        id: 'qr',
        title: 'Código QR en la factura',
        text: 'Las facturas llevan un código QR con el que quien las recibe puede enviar sus datos a la Agencia Tributaria para cotejarlas.',
      },
      {
        id: 'modes',
        title: 'Dos formas de cumplir',
        text: 'En la modalidad Verifactu, el programa envía cada registro a la Agencia Tributaria al momento. En la otra, los guarda firmados, con un registro de eventos, y los entrega si Hacienda los pide.',
      },
      {
        id: 'declaration',
        title: 'Declaración responsable',
        text: 'El fabricante del programa declara por escrito que cumple el reglamento. No la emite Hacienda: la firma el propio fabricante, y puedes pedírsela o encontrarla en el programa.',
      },
      {
        id: 'sanctions',
        title: 'Sanciones',
        text: `La Ley General Tributaria (artículo 201 bis) prevé una multa de ${formatMoney('es', 50000)} por cada ejercicio por usar un programa que no cumple cuando debería, y sanciones mayores para quien lo fabrica o lo vende.`,
      },
    ],
  },
  work: {
    eyebrow: 'Qué hacemos',
    title: {
      before: 'Tu facturación, adaptada ',
      emphasis: 'sin parar de vender',
      after: '',
    },
    items: [
      {
        id: 'audit',
        title: 'Auditoría de por dónde salen tus facturas',
        text: 'Listamos cada sitio desde el que facturas (la tienda online, el TPV, el CRM, el ERP, un programa hecho a medida o una hoja de cálculo), comprobamos si cada uno está adaptado y te damos un plan con lo que hay que cambiar y lo que cuesta.',
      },
      {
        id: 'connect',
        title: 'Conexión con un programa adaptado',
        // TODO(albert): confirm Holded shows its declaración responsable for the current version
        text: 'Hacemos que tu tienda, tu CRM o tu programa propio creen las facturas en un programa de facturación adaptado, como Holded, a través de su API. La factura se emite allí, con su registro y su QR, y tu equipo sigue trabajando como siempre.',
      },
      {
        id: 'migrate',
        title: 'Migración desde un programa sin adaptar',
        text: 'Si tu programa actual no se va a adaptar, pasamos clientes, productos, series de numeración y facturas pendientes a uno que sí lo esté, cuadramos los totales y dejamos exportado el histórico.',
      },
      {
        id: 'custom',
        title: 'Programas hechos a medida',
        text: 'Si facturas desde un desarrollo propio, valoramos contigo si conviene adaptarlo o que pase a crear las facturas en un programa adaptado, que suele ser más sencillo de mantener.',
      },
    ],
    limits:
      'No vendemos programas de facturación ni damos asesoramiento fiscal: qué modalidad elegir o cómo tratar un caso concreto lo decides con tu asesoría, y nosotros lo dejamos funcionando.',
  },
  disclaimer:
    'Esta página resume la normativa para explicar nuestro trabajo; no es asesoramiento fiscal ni jurídico. Consulta tu caso con tu asesoría.',
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: { before: 'Preguntas sobre ', emphasis: 'Verifactu', after: '' },
    items: [
      {
        id: 'verifactu-change-software',
        question: '¿Tengo que cambiar de programa de facturación?',
        answer:
          'No necesariamente. Si el fabricante de tu programa ha publicado su declaración responsable para la versión que usas, basta con usarlo bien y con que todas tus facturas salgan de él. Solo hace falta cambiar si tu programa no se va a adaptar o si facturas también desde herramientas que no lo están, como un plugin de la tienda o una hoja de cálculo.',
      },
      {
        id: 'verifactu-shop',
        question: 'Vendo online. ¿Mi tienda tiene que cumplir Verifactu?',
        answer:
          'Si la tienda emite facturas, sí: el plugin o módulo que las genera también es un programa de facturación. La alternativa habitual es que la tienda no facture y envíe cada pedido a tu programa de facturación adaptado, que es lo que hacen nuestras integraciones de Holded con PrestaShop y WooCommerce.',
      },
      {
        id: 'verifactu-deadline',
        question: '¿Cuándo tengo que estar listo de verdad?',
        answer: `Con la norma en vigor, antes del ${companies} si tu negocio paga el Impuesto sobre Sociedades y antes del ${others} en el resto de casos. Hacienda anunció el ${announcedOn} que lo aplazará a ${announcedTo}, pero mientras no se publique en el BOE conviene planificar con las fechas actuales: una integración lleva semanas, no días.`,
      },
      {
        id: 'verifactu-mode',
        question:
          '¿Qué modalidad me conviene, la que envía los registros a Hacienda o la otra?',
        answer:
          'Depende de tu negocio, y lo decides con tu asesoría. En la modalidad Verifactu, el programa envía cada registro a Hacienda al momento y no necesita firmarlo; en la otra, los guarda firmados, con un registro de eventos, y los entrega si te los piden. Nuestras integraciones funcionan igual con las dos, porque la modalidad se elige en el programa de facturación.',
      },
      {
        id: 'verifactu-sii',
        question: 'Ya presento el SII. ¿Me afecta?',
        answer:
          'No. El reglamento excluye a quienes llevan los libros registro del IVA a través del SII (Suministro Inmediato de Información). Si en algún momento dejas de estar en el SII, a partir de entonces sí te aplicaría.',
      },
    ],
  },
  related: [
    'integrations',
    'holdedPrestashop',
    'holdedWoocommerce',
    'holdedHubspot',
  ],
} satisfies VerifactuPageContent;
