import type { Founder } from '@/content/types';

export const founder = {
  name: 'Albert Sabaté',
  role: 'Founder',
  bio: [
    'Leads the Zenet Labs team. 15+ years building and leading engineering teams, including leading engineering at Splyt as its global mobility network scaled across several countries, and core contributions to ',
    { text: 'Brisa', href: 'https://brisa.build/' },
    ', an open-source web framework. He also runs Viatsy and Taplany, our own companies, with agents doing the repetitive work.',
  ],
  // TODO(albert): founder photo (WebP ≤ 40 KB, 2× the rendered size) under public/, then set { src, width, height }
  photo: null,
  // TODO(albert): LinkedIn / GitHub URLs
  sameAs: [],
} satisfies Founder;
