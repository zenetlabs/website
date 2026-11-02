import { cases } from '@/content/es/cases';
import { companies } from '@/content/es/companies';
import { verifactuDates } from '@/content/es/verifactu';
import type { HomeContent } from '@/content/types';

export const home = {
  hero: {
    title: {
      before: 'Deja de hacer ',
      emphasis: 'a mano',
      after: ' lo que tus herramientas pueden hacer solas.',
    },
    lead: 'Conectamos las herramientas que ya usa tu empresa (ERP, tienda online, CRM, WhatsApp, Excel) y ponemos agentes de IA a hacer el trabajo repetitivo, para que tu equipo deje de pasar datos a mano.',
    primary: 'Reserva un diagnóstico',
    secondary: 'Ver precios',
    audience: 'Para pymes de 10 a 100 personas',
    diagnostic: 'Diagnóstico',
  },
  proof: {
    title: 'Una ejecución de un agente',
    caption: 'Ejemplo ilustrativo',
    description:
      'Una ejecución de un agente: cuadra las facturas de proveedores con los pedidos, responde a las consultas sobre pedidos y prepara el informe semanal de operaciones; después se detiene y pide a una persona que apruebe una devolución.',
    lines: [
      'Cuadró las facturas de proveedores con los pedidos',
      'Respondió a las consultas sobre pedidos',
      'Preparó el informe semanal de operaciones',
    ],
    approval: {
      title: 'Necesita tu aprobación',
      detail: 'Una devolución espera a que una persona decida.',
      approve: 'Aprobar',
      hold: 'Retener',
    },
  },
  companies: {
    title: 'Nuestras propias empresas ya funcionan con agentes',
    items: companies,
  },
  problems: {
    title: {
      before: 'Tres tareas que tu equipo ',
      emphasis: 'no debería',
      after: ' hacer a mano',
    },
    fixLabel: 'Qué hacemos',
    items: [
      {
        id: 'orders',
        title: 'Pedidos copiados a mano',
        problem:
          'Cada pedido de la tienda o del marketplace se vuelve a teclear en el ERP o en un Excel. Un error y sale el producto equivocado.',
        fix: 'Conectamos la tienda con tu ERP y tu facturación: cada pedido entra una vez, completo y con el stock al día.',
      },
      {
        id: 'invoices',
        title: 'Facturas tecleadas',
        problem:
          'Las facturas de proveedores llegan en PDF y alguien las pasa a contabilidad línea a línea.',
        fix: 'Un agente lee cada factura, la cuadra con el pedido y solo deja a una persona las excepciones.',
      },
      {
        id: 'customers',
        title: 'Clientes atendidos de uno en uno',
        problem:
          'Las mismas preguntas todo el día por WhatsApp y correo: dónde está mi pedido, si hay stock, cuánto cuesta.',
        fix: 'Un agente responde lo rutinario con los datos de tus sistemas y pasa el resto a tu equipo, con todo el contexto.',
      },
    ],
  },
  verifactu: {
    title: {
      before: 'Que cada venta genere ',
      emphasis: 'su factura',
      after: ', y que cumpla',
    },
    paragraphs: [
      `Si facturas con un programa, tendrá que cumplir el Reglamento Verifactu (RD 1007/2023). Según la norma en vigor, las sociedades deben estar adaptadas antes del ${verifactuDates.companies} y los autónomos y el resto, antes del ${verifactuDates.others}.`,
      `Hacienda anunció el ${verifactuDates.announcedOn} que quiere aplazarlo a ${verifactuDates.announcedTo}, pero todavía no se ha publicado en el BOE.`,
      'No te afecta si ya llevas los libros por el SII o si tu domicilio fiscal está en el País Vasco o Navarra, donde rigen sus propias normas.',
      // TODO(albert): confirm Holded shows its declaración responsable for the current version
      'Conectamos tu tienda, tu CRM o tu ERP con un programa de facturación adaptado, como Holded, para que las facturas salgan solas.',
    ],
    cta: 'Cómo te ayudamos con Verifactu',
    checked: `Fechas revisadas el ${verifactuDates.checkedOn}.`,
  },
  services: {
    title: {
      before: 'Qué hacemos y ',
      emphasis: 'cuánto cuesta',
      after: '',
    },
    lead: 'Todo proyecto empieza con un diagnóstico a precio cerrado. Precios en euros, IVA no incluido.',
    more: 'Ver todos los precios',
    calculator: 'Calcula tu proyecto',
  },
  process: {
    title: {
      before: 'Empieza con poco, ',
      emphasis: 'compruébalo',
      after: ' y luego crece',
    },
    steps: [
      {
        id: 'diagnose',
        label: 'Diagnosticar',
        text: 'En una o dos semanas analizamos tus herramientas y el trabajo manual, y te damos un plan con precio.',
      },
      {
        id: 'pilot',
        label: 'Piloto',
        text: 'Automatizamos un proceso de principio a fin, en producción y con tu equipo, antes de que te comprometas a más.',
      },
      {
        id: 'scale',
        label: 'Escalar',
        text: 'Llevamos lo que ha funcionado a más procesos y herramientas, con monitorización y aprobaciones donde hacen falta.',
      },
      {
        id: 'maintain',
        label: 'Mantener',
        text: 'Vigilamos, corregimos y mejoramos cada mes, para que todo siga funcionando cuando cambian tus herramientas.',
      },
    ],
  },
  cases: {
    title: {
      before: 'Lo probamos primero en ',
      emphasis: 'nuestras empresas',
      after: '',
    },
    lead: 'Antes de montar una automatización para un cliente, la usamos en un negocio propio.',
    automatedLabel: 'Qué funciona solo',
    items: cases,
  },
  founder: {
    title: {
      before: 'Trabajas con ',
      emphasis: 'quien lo construye',
      after: '',
    },
    more: 'Más sobre Albert',
  },
  faq: {
    title: { before: 'Lo que ', emphasis: 'más', after: ' nos preguntan' },
  },
  contact: {
    title: {
      before: 'Reserva tu ',
      emphasis: 'diagnóstico de automatización',
      after: '.',
    },
    lead: 'Cuéntanos qué herramientas usa tu empresa y qué sigue haciendo tu equipo a mano. Te responde una persona y acordamos contigo el siguiente paso.',
    mail: '¿Prefieres el correo? Escribe a',
    human: 'Te responde una persona, personalmente.',
    book: '¿Prefieres una llamada? Elige una hora',
    // TODO(albert): revisar el texto de voz
    voice: {
      text: '¿Prefieres hablar? Nuestro asistente de voz con IA responde tus dudas y te reserva una llamada.',
      button: 'Habla con el asistente',
    },
  },
} satisfies HomeContent;
