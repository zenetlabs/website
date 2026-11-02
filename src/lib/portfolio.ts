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
    // TODO(albert): send the current Viatsy SVG; until then the strip sets the name in type
    logo: null,
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
  logo: PortfolioLogo | null;
}[];

export type PortfolioKey = (typeof PORTFOLIO)[number]['key'];
