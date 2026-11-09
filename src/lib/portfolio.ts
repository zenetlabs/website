export const TAPLANY_HREF = 'https://taplany.com';

type PortfolioLogo = {
  src: `/logos/${string}.svg`;
  width: number;
  height: number;
};

export const PORTFOLIO = [
  {
    key: 'viatsy',
    name: 'Viatsy',
    href: 'https://viatsy.com',
    logo: { src: '/logos/viatsy.svg', width: 600, height: 136.5 },
  },
  {
    key: 'mexica',
    name: 'Mexica Travel',
    href: 'https://mexicatravel.com',
    logo: { src: '/logos/mexica.svg', width: 200.4, height: 64 },
  },
  {
    key: 'taplany',
    name: 'Taplany',
    href: TAPLANY_HREF,
    logo: { src: '/logos/taplany.svg', width: 296.7, height: 100 },
  },
  {
    key: 'brisily',
    name: 'Brisily',
    href: 'https://brisily.com',
    logo: { src: '/logos/brisily.svg', width: 1600, height: 560 },
  },
  {
    key: 'luce',
    name: 'Luce',
    href: 'https://luce.es',
    logo: { src: '/logos/luce.svg', width: 1024, height: 288 },
  },
] as const satisfies readonly {
  key: string;
  name: string;
  href: string;
  logo: PortfolioLogo;
}[];

export type PortfolioKey = (typeof PORTFOLIO)[number]['key'];

export type PortfolioEntry = (typeof PORTFOLIO)[number];

export function portfolioOf(key: PortfolioKey): PortfolioEntry {
  const found = PORTFOLIO.find((entry) => entry.key === key);
  if (!found) throw new Error(key);
  return found;
}
