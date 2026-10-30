// TODO(albert): review answers
import { services } from '@/content/es/services';
import { verifactuDates } from '@/content/es/verifactu';
import type { FaqItem, ServiceId } from '@/content/types';
import { formatPriceSummary } from '@/lib/money';
import { PUBLIC_EMAIL } from '@/lib/site';

const price = (id: ServiceId) => formatPriceSummary('es', services[id].prices);

export const faq = [
  {
    id: 'what-we-do',
    question: '¿Qué hacéis y qué no?',
    answer:
      'Conectamos las herramientas que ya usa tu empresa, automatizamos el trabajo repetitivo entre ellas y ponemos en producción agentes de IA para tareas como clasificar, responder o leer documentos. También hacemos webs y apps a medida, formamos equipos y mantenemos lo que construimos. No revendemos licencias, no gestionamos campañas de pago ni sustituimos a tu gestoría ni a tu soporte informático.',
  },
  {
    id: 'fit',
    question: '¿Para qué empresas es?',
    answer:
      'Para empresas de unas 10 a 100 personas que trabajan con varias herramientas que no se hablan entre sí (un programa de facturación o un ERP, una tienda online, un CRM, WhatsApp, Excel) y pierden horas pasando datos de una a otra. Un equipo más pequeño puede empezar por una sola integración.',
  },
  {
    id: 'tools',
    question: '¿Con qué herramientas trabajáis?',
    answer:
      'Sobre todo con Holded, PrestaShop, WooCommerce, Shopify, HubSpot, Google Workspace, Microsoft 365, WhatsApp Business y Excel. Si una herramienta tiene API o una exportación fiable, casi siempre podemos conectarla. El diagnóstico confirma qué es posible antes de que te comprometas a nada.',
  },
  {
    id: 'replace-tools',
    question: '¿Tenemos que cambiar de herramientas?',
    answer:
      'No. Trabajamos con lo que ya tienes y solo proponemos un cambio cuando una herramienta es el cuello de botella, por ejemplo si no se puede conectar con nada. Cualquier cambio que propongamos llega con su coste, y decides tú.',
  },
  {
    id: 'timeline',
    question: '¿Cuánto tarda un proyecto?',
    answer:
      'El diagnóstico dura una o dos semanas. Su plan fija un plazo para cada fase, y acotamos la primera entrega para que esté funcionando en semanas, no en meses. Los agentes grandes y las apps a medida se dividen en fases, cada una con su propio resultado.',
  },
  {
    id: 'prices',
    question: '¿Cuánto cuesta?',
    answer: `El diagnóstico cuesta ${price('diagnostic')} y se descuenta del proyecto si sigues adelante en 60 días. Una integración o automatización cuesta ${price('integration')}; un agente de IA en producción, ${price('agent')}, y una web o app a medida, ${price('web')}. Los precios no incluyen el IVA. Formación, mantenimiento y crecimiento están en la página de precios.`,
  },
  {
    id: 'verifactu',
    question: '¿Nos ayudáis con Verifactu?',
    answer: `Sí. Si facturas con un programa, debe cumplir el Reglamento Verifactu. Con la norma en vigor, las sociedades deben estar adaptadas antes del ${verifactuDates.companies} y los autónomos y el resto, antes del ${verifactuDates.others}; Hacienda ha anunciado un aplazamiento a ${verifactuDates.announcedTo} que aún no está en el BOE. Te ayudamos a elegir un programa adaptado y a conectarlo con tu tienda, tu CRM o tu ERP para que las facturas salgan solas. No aplica si llevas los libros por el SII o si tu domicilio fiscal está en el País Vasco o Navarra.`,
  },
  {
    id: 'maintenance',
    question: '¿Qué incluye el mantenimiento?',
    answer:
      'Monitorización y avisos de errores, correcciones, actualizaciones cuando cambia alguna de tus herramientas y una revisión mensual de qué mejorar. Los tres planes mensuales se diferencian en cuántas automatizaciones y agentes cubren y en cuánto trabajo de mejora incluyen.',
  },
  {
    id: 'ownership',
    question: '¿De quién son el código y los datos?',
    answer:
      'Tuyos. Trabajamos en tus cuentas siempre que se puede, el código que escribimos para ti es tuyo una vez pagado el proyecto y tus datos se quedan en tus sistemas. Si dejamos de trabajar juntos, todo sigue funcionando y queda documentado.',
  },
  {
    id: 'privacy',
    question: '¿Dónde se guardan nuestros datos y cómo tratáis la privacidad?',
    answer:
      'Antes de construir acordamos dónde estarán los datos y te decimos qué proveedores van a tocarlos. Cumplimos el RGPD y firmamos un contrato de encargado del tratamiento. Usamos proveedores de IA que no entrenan con tus datos y te avisamos desde el principio si un caso de uso está regulado por el Reglamento Europeo de IA, como filtrar candidatos en un proceso de selección.',
  },
  {
    id: 'mistakes',
    question: '¿Qué pasa si un agente se equivoca?',
    answer:
      'Lo tenemos previsto. Los agentes trabajan dentro de los límites que acordamos contigo; las acciones con consecuencias, como pagos, devoluciones o mensajes a clientes importantes, esperan la aprobación de una persona, y todo queda registrado. Si algo falla, la monitorización lo detecta, corregimos la causa y añadimos el caso a las pruebas del agente.',
  },
  {
    id: 'models',
    question: '¿Qué modelos de IA usáis?',
    answer:
      'El que haga bien la tarea al menor coste y cumpla tus requisitos de privacidad: modelos de proveedores como OpenAI, Anthropic o Google, o modelos abiertos alojados en la región que elijas. Antes de decidir, los probamos con tus casos reales.',
  },
  {
    id: 'training',
    question: '¿Formáis a nuestro equipo?',
    answer:
      'Sí. Los talleres son prácticos y trabajan sobre tus propios procesos, no sobre ejemplos genéricos. La mentoría mensual da continuidad: revisamos lo que construye el equipo, le ayudamos cuando se atasca y acordamos normas sencillas para usar la IA en el trabajo.',
  },
  {
    id: 'results',
    question: '¿Cómo sabemos si funciona?',
    answer:
      'En el diagnóstico medimos cuánto tarda hoy cada proceso. Cuando la automatización ya está en marcha, comparamos las mismas cifras: horas dedicadas, errores y tiempos de respuesta. Si una automatización no compensa, te lo decimos.',
  },
  {
    id: 'where',
    question: '¿Trabajáis con empresas de fuera de España?',
    answer:
      'Sí. Trabajamos en remoto con empresas de España, Singapur y otros países, en español o en inglés. Los precios de esta web son para España, en euros; la versión en inglés muestra los precios para Singapur en dólares de Singapur.',
  },
  {
    id: 'start',
    question: '¿Cómo empezamos?',
    answer: `Reserva un diagnóstico con el formulario de esta página o escribe a ${PUBLIC_EMAIL}. Te responde una persona, acordamos el alcance en una llamada breve y, en una o dos semanas, tienes un plan con precio. Si sigues adelante en 60 días, el importe del diagnóstico se descuenta del proyecto.`,
  },
] satisfies readonly FaqItem[];
