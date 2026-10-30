import type { Founder } from '@/content/types';

export const founder = {
  name: 'Albert Sabaté',
  role: 'Fundador',
  bio: [
    'Más de 15 años creando y liderando equipos de ingeniería: dirigió la ingeniería de Splyt mientras su red de movilidad global se expandía a varios países y ha contribuido al núcleo de ',
    { text: 'Brisa', href: 'https://brisa.build/' },
    ', un framework web de código abierto. Hoy dirige Viatsy y Taplany con agentes que hacen el trabajo repetitivo.',
  ],
  // TODO(albert): founder photo (WebP ≤ 40 KB, 2× the rendered size) under public/, then set { src, width, height }
  photo: null,
  // TODO(albert): LinkedIn / GitHub URLs
  sameAs: [],
} satisfies Founder;
