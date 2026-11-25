import type { AboutPageContent } from '@/content/types';

export const aboutPage = {
  meta: {
    title: 'Sobre nosotros',
    metaTitle: 'Sobre Zenet Labs y su fundador, Albert Sabaté',
    description:
      'Zenet Labs hace automatizaciones y agentes de IA para pymes. Nuestro equipo, con su fundador Albert Sabaté al frente, automatiza primero sus propias empresas.',
  },
  title: {
    before: 'Automatización hecha por gente que ',
    emphasis: 'dirige negocios',
    after: '',
  },
  lead: 'En Zenet Labs hacemos automatizaciones, integraciones y agentes de IA para pymes, y usamos las mismas herramientas cada día en las empresas que dirigimos.',
  story: [
    {
      id: 'track',
      parts: [
        'Albert fundó Zenet Labs en 2022 y está al frente del equipo. Lleva más de 15 años creando y liderando equipos de ingeniería: dirigió la ingeniería de Splyt mientras su red global de movilidad se expandía a varios países, y contribuyó al núcleo de ',
        { text: 'Brisa', href: 'https://brisa.build/' },
        ', un framework web de código abierto.',
      ],
    },
    {
      id: 'today',
      parts: [
        'También dirige Viatsy y Taplany, nuestras propias empresas, con agentes que hacen el trabajo repetitivo. Lo que funciona ahí es lo que construimos para nuestros clientes.',
      ],
    },
  ],
  principles: {
    title: 'Cómo trabajamos',
    items: [
      {
        id: 'builder',
        title: 'Lo define y lo construye el mismo equipo',
        text: 'Sin intermediarios: quienes definen tu proyecto son quienes lo construyen.',
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
    cases: 'Leer los casos',
  },
  vision: {
    title: 'Hacia dónde vamos',
    text: 'Creemos que todas las empresas acabarán teniendo agentes que lleven parte de la operación, con personas que fijan los objetivos y revisan los resultados: una empresa agéntica. Ayudamos a las pymes a llegar ahí proceso a proceso, empezando por el trabajo que nadie quiere hacer a mano.',
  },
  cta: {
    title: 'Cuéntanos qué hace tu equipo a mano',
    text: 'Te respondemos y acordamos contigo el siguiente paso.',
    button: 'Reservar una llamada',
  },
} satisfies AboutPageContent;
