import type { CalculatorPageContent } from '@/content/types';

export const calculatorPage = {
  meta: {
    title: 'Calculadora de precio',
    metaTitle: 'Calculadora de precio para automatización e IA | Zenet Labs',
    description:
      'Responde seis preguntas y obtén un rango orientativo en euros (sin IVA), un plazo y el plan de mantenimiento que encaja. No es un presupuesto: el precio final sale del diagnóstico.',
  },
  breadcrumb: { label: 'Ruta de navegación', pricing: 'Precios' },
  eyebrow: 'Calculadora',
  title: {
    before: '¿Cuánto podría ',
    emphasis: 'costar',
    after: ' tu proyecto?',
  },
  lead: 'Seis preguntas, un minuto y un rango orientativo para tu proyecto. No hace falta dejar el correo para verlo.',
  disclaimer: {
    title: 'Estimación orientativa, no un presupuesto',
    text: 'El rango sale de reglas fijas basadas en nuestros precios publicados, no de un modelo de IA. El precio final sale del diagnóstico, en el que analizamos tus procesos y herramientas reales.',
  },
  taxNote: 'Precios en euros, sin IVA.',
  privacy: 'Solo guardamos tus respuestas si nos las envías.',
  pricingLink: 'Ver todos los precios',
  submit: 'Ver mi estimación',
  questions: {
    type: {
      legend: '¿Qué quieres construir primero?',
      options: {
        automation: {
          label: 'Conectar herramientas o automatizar un proceso',
          hint: 'Pedidos, facturas o datos que pasan solos de una herramienta a otra.',
        },
        agent: {
          label: 'Un agente de IA que haga una tarea',
          hint: 'Clasificar, responder o leer documentos, con una persona aprobando lo importante.',
        },
        web: { label: 'Una web, un portal o una herramienta interna a medida' },
      },
    },
    tools: {
      legend: '¿Qué herramientas intervienen?',
      hint: 'Marca cada tipo de herramienta con la que tenga que trabajar. El número de casillas también cuenta.',
      options: {
        erp: {
          label: 'ERP o facturación',
          hint: 'Holded, Odoo, A3, Sage…',
        },
        shop: {
          label: 'Tienda online',
          hint: 'Shopify, PrestaShop, WooCommerce…',
        },
        crm: { label: 'CRM', hint: 'HubSpot, Pipedrive…' },
        messaging: { label: 'WhatsApp, correo o chat' },
        sheets: {
          label: 'Hojas de cálculo',
          hint: 'Excel, Google Sheets',
        },
        documents: {
          label: 'PDF o documentos escaneados',
          hint: 'Facturas, albaranes',
        },
        custom: { label: 'Un programa propio o antiguo' },
        other: { label: 'Otra herramienta' },
      },
    },
    volume: {
      legend: '¿Cuántos pedidos, documentos o mensajes al mes?',
      options: {
        low: { label: 'Menos de 100' },
        medium: { label: 'Entre 100 y 1.000' },
        high: { label: 'Entre 1.000 y 10.000' },
        'very-high': { label: 'Más de 10.000' },
      },
    },
    extras: {
      legend: '¿Algo más que incluir?',
      hint: 'Si no, déjalo en blanco. Tu proyecto principal ya está contado.',
      options: {
        agent: { label: 'Un agente de IA' },
        web: { label: 'Una web, un portal o una app' },
      },
    },
    urgency: {
      legend: '¿Para cuándo lo necesitas?',
      options: {
        flexible: { label: 'Sin prisa: cuando os venga bien' },
        standard: { label: 'En los próximos meses' },
        urgent: { label: 'Lo antes posible' },
      },
    },
    maintenance: {
      legend: '¿Quieres que lo mantengamos y operemos después?',
      options: {
        yes: { label: 'Sí, con un plan de mantenimiento' },
        no: { label: 'No, lo llevará mi equipo' },
      },
    },
  },
  result: {
    title: 'Tu estimación orientativa',
    empty:
      'Responde a las preguntas y pulsa «Ver mi estimación». El rango aparece aquí, en esta misma página.',
    short:
      'Estimación orientativa, no un presupuesto. El precio final sale del diagnóstico.',
    labels: {
      total: 'Proyecto',
      timeline: 'Plazo',
      maintenance: 'Mantenimiento',
      diagnostic: 'Primer paso',
      answers: 'Tus respuestas',
    },
    weeks: '{min}–{max} semanas tras el diagnóstico',
    weeksSingle: '{n} semanas tras el diagnóstico',
    breakdown: 'Cómo lo calculamos',
    tools: {
      none: 'sin herramientas que conectar',
      one: '1 herramienta',
      many: '{n} herramientas',
    },
    custom: 'con un programa propio o antiguo',
    addOn: 'se suma al proyecto principal',
    capped: 'en el máximo que podemos estimar aquí',
    volume: 'Volumen',
    urgency: 'Urgencia',
    noChange: 'sin cambio',
    percent: '{sign}{n} %',
    rounding:
      'Se aplica a cada línea. Los rangos se redondean hacia fuera a múltiplos de {step}, y ninguna línea baja de su precio «desde» publicado ni supera su rango publicado.',
    cappedNote:
      'Al menos una línea ha llegado al máximo que puede estimar esta calculadora. Los proyectos de este tamaño se presupuestan en el diagnóstico.',
    maintenanceWanted: 'Plan recomendado: {plan}, {price}',
    maintenanceNotWanted:
      'No incluido. Si cambias de idea, el plan que encaja es {plan} ({price}).',
    diagnosticText:
      '{name}, {price}. Se descuenta del proyecto si sigues adelante en 60 días.',
    share:
      'La dirección de esta página guarda tus respuestas: puedes guardarla o enviársela a un compañero.',
    change: 'Cambiar mis respuestas',
  },
  contact: {
    title: {
      before: '¿Quieres ',
      emphasis: 'comentarlo',
      after: ' con nosotros?',
    },
    lead: 'Déjanos tus datos y te responderemos personalmente. Tus respuestas y esta estimación se añaden al mensaje, así partimos de los mismos números. Es opcional: la estimación de arriba ya es tuya.',
    intro:
      'Estimación de la calculadora de precio (orientativa, reglas {version}):',
    page: 'Página del resultado',
    mail: '¿Prefieres escribir? Escribe a',
  },
} satisfies CalculatorPageContent;
