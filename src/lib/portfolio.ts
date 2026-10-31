export const TAPLANY_HREF = 'https://taplany.com';

export const PORTFOLIO = [
  { key: 'viatsy', name: 'Viatsy', href: 'https://viatsy.com' },
  { key: 'mexica', name: 'Mexica Travel', href: 'https://mexicatravel.com' },
  { key: 'taplany', name: 'Taplany', href: TAPLANY_HREF },
  { key: 'brisily', name: 'Brisily', href: 'https://brisily.com' },
  { key: 'luce', name: 'Luce', href: 'https://luce.es' },
] as const;

export type PortfolioKey = (typeof PORTFOLIO)[number]['key'];
