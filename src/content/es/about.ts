import type { AboutPageContent } from '@/content/types';

export const aboutPage = {
  eyebrow: 'Sobre nosotros',
  title: {
    before: 'Automatización hecha por gente que ',
    emphasis: 'dirige negocios',
    after: '',
  },
  lead: 'Zenet Labs es un estudio pequeño fundado en 2022 por Albert Sabaté. Hacemos automatizaciones, integraciones y agentes de IA para pymes, y usamos las mismas herramientas cada día en las empresas que dirigimos.',
  story: [
    {
      id: 'track',
      parts: [
        'Albert lleva más de 15 años creando y liderando equipos de ingeniería. Dirigió la ingeniería de Splyt mientras su red de movilidad global se expandía a varios países y ha contribuido al núcleo de ',
        { text: 'Brisa', href: 'https://brisa.build/' },
        ', un framework web de código abierto.',
      ],
    },
    {
      id: 'today',
      parts: [
        'Hoy dirige Viatsy y Taplany con agentes que hacen el trabajo repetitivo, y trabaja directamente con cada cliente de Zenet Labs.',
      ],
    },
  ],
  principles: {
    title: 'Cómo trabajamos',
    items: [
      {
        id: 'builder',
        title: 'Hablas con quien lo construye',
        text: 'Sin intermediarios: quien define tu proyecto es quien lo construye.',
      },
      {
        id: 'ownership',
        title: 'Todo queda en tus manos',
        text: 'El código, las cuentas y los datos son tuyos. Si dejamos de trabajar juntos, todo sigue funcionando.',
      },
      {
        id: 'approval',
        title: 'Las personas aprueban lo importante',
        text: 'Los agentes actúan dentro de los límites acordados, y lo que tiene consecuencias espera a una persona.',
      },
      {
        id: 'measured',
        title: 'Medido, no prometido',
        text: 'Medimos cada proceso antes de tocarlo y comparamos cuando ya está en marcha.',
      },
    ],
  },
  companies: {
    title: 'Las empresas que dirigimos',
    lead: 'Productos que construimos y operamos con automatizaciones y agentes. Ahí aprendemos qué funciona.',
  },
  vision: {
    title: 'Hacia dónde vamos',
    text: 'Creemos que todas las empresas acabarán teniendo agentes que lleven parte de la operación, con personas que fijan los objetivos y revisan los resultados: una empresa agéntica. Ayudamos a las pymes a llegar ahí proceso a proceso, empezando por el trabajo que nadie quiere hacer a mano.',
  },
  cta: {
    title: 'Cuéntanos qué hace tu equipo a mano',
    text: 'Te responde una persona y acordamos contigo el siguiente paso.',
    button: 'Reserva un diagnóstico',
  },
} satisfies AboutPageContent;
