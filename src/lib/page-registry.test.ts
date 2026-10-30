import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';
import {
  createRewrite,
  hasLocale,
  PAGE_IDS,
  PAGES,
  type PageEntry,
  type PageId,
  pageForSlug,
  pageLocales,
  pagePath,
  pagesIn,
  localizedRewrite as rewrite,
  routeOf,
  slugForms,
  switchHref,
} from '@/lib/page-registry';

const SLUG = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;
const ORIGIN = 'https://zenetlabs.com';

function run(direction: 'input' | 'output', path: string): string {
  const url = new URL(`${ORIGIN}${path}`);
  const result = rewrite[direction]?.({ url });
  return result instanceof URL ? result.pathname + result.search : path;
}

const presentSlugs = PAGE_IDS.flatMap((page) =>
  locales.flatMap((locale) => {
    const slug = PAGES[page].slugs[locale];
    return slug === undefined ? [] : [[page, locale, slug] as const];
  }),
);

describe('PAGES', () => {
  it.each(presentSlugs)('%s (%s) slug %s is well-formed', (_page, _l, slug) => {
    expect(slug).toMatch(SLUG);
  });

  it.each(PAGE_IDS.map((page) => routeOf(page)))(
    'route %s is well-formed',
    (route) => {
      expect(route).toMatch(SLUG);
    },
  );

  it.each(locales)('slugs are unique within %s', (locale) => {
    const slugs = presentSlugs
      .filter(([, l]) => l === locale)
      .map(([, , slug]) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('never shares a slug or route between two different pages', () => {
    const owners = new Map<string, PageId>();
    for (const page of PAGE_IDS) {
      for (const slug of slugForms(page)) {
        expect(owners.get(slug) ?? page, slug).toBe(page);
        owners.set(slug, page);
      }
    }
  });

  it('resolves every slug and route back to its page', () => {
    for (const [page, , slug] of presentSlugs) {
      expect(pageForSlug(slug)).toBe(page);
    }
    expect(pageForSlug('/pricing')).toBe('pricing');
    expect(pageForSlug('/precios')).toBe('pricing');
    expect(pageForSlug('/about')).toBe('about');
    expect(pageForSlug('/sobre-nosotros')).toBe('about');
    expect(pageForSlug('/legal-notice')).toBe('legalNotice');
    expect(pageForSlug('/aviso-legal')).toBe('legalNotice');
    expect(pageForSlug('/nope')).toBeUndefined();
  });

  it.each(PAGE_IDS)('%s has a YYYY-MM-DD lastmod', (page) => {
    expect(PAGES[page].lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(PAGE_IDS)('%s route resolves to the page', (page) => {
    expect(pageForSlug(routeOf(page))).toBe(page);
  });
});

describe('pageLocales and hasLocale', () => {
  it.each([
    ['home', ['en', 'es']],
    ['pricing', ['en', 'es']],
    ['about', ['en', 'es']],
    ['privacy', ['en', 'es']],
    ['cookies', ['en', 'es']],
    ['legalNotice', ['es']],
  ] as const)('%s is in %j', (page, expected) => {
    expect(pageLocales(page)).toEqual(expected);
    for (const locale of locales) {
      expect(hasLocale(page, locale)).toBe(expected.some((l) => l === locale));
    }
  });
});

describe('pagesIn and slugForms', () => {
  it('lists the pages present in each locale', () => {
    expect(pagesIn('en')).toEqual([
      'home',
      'pricing',
      'about',
      'privacy',
      'cookies',
    ]);
    expect(pagesIn('es')).toEqual([
      'home',
      'pricing',
      'about',
      'privacy',
      'cookies',
      'legalNotice',
    ]);
  });

  it('lists every public slug and the route of a page', () => {
    expect(slugForms('privacy')).toEqual([
      '/privacy',
      '/privacidad',
      '/privacy',
    ]);
    expect(slugForms('legalNotice')).toEqual(['/aviso-legal', '/legal-notice']);
  });
});

describe('pagePath', () => {
  it.each([
    ['en', 'home', '/'],
    ['en', 'pricing', '/pricing'],
    ['en', 'about', '/about'],
    ['en', 'privacy', '/privacy'],
    ['en', 'cookies', '/cookies'],
    ['en', 'legalNotice', '/es/aviso-legal'],
    ['es', 'home', '/es'],
    ['es', 'pricing', '/es/precios'],
    ['es', 'about', '/es/sobre-nosotros'],
    ['es', 'privacy', '/es/privacidad'],
    ['es', 'cookies', '/es/cookies'],
    ['es', 'legalNotice', '/es/aviso-legal'],
  ] as const)('%s %s is %s', (locale, page, expected) => {
    expect(pagePath(locale, page)).toBe(expected);
  });
});

describe('switchHref', () => {
  it.each([
    ['es', 'privacy', '?x=1', '/es/privacidad?x=1'],
    ['en', 'privacy', '', '/privacy'],
    ['en', 'legalNotice', '?x=1', '/'],
    ['es', 'legalNotice', '?x=1', '/es/aviso-legal?x=1'],
    ['en', undefined, '?x=1', '/'],
    ['es', undefined, '?x=1', '/es'],
  ] as const)('to %s from %s%s is %s', (target, page, search, expected) => {
    expect(switchHref(target, page, search)).toBe(expected);
  });
});

describe('routeOf', () => {
  it('defaults to the English slug and honours an explicit route', () => {
    expect(routeOf('privacy')).toBe('/privacy');
    expect(routeOf('home')).toBe('/');
    expect(routeOf('legalNotice')).toBe('/legal-notice');
  });
});

describe('localizedRewrite', () => {
  const publicPaths = PAGE_IDS.flatMap((page) =>
    pageLocales(page).map((locale) => pagePath(locale, page)),
  );

  it.each(publicPaths)(
    'the output of the input of %s is the same url',
    (path) => {
      expect(run('output', run('input', path))).toBe(path);
    },
  );

  it('maps the Spanish slug to the English route and back', () => {
    expect(run('input', '/es/privacidad')).toBe('/es/privacy');
    expect(run('output', '/es/privacy')).toBe('/es/privacidad');
    expect(run('input', '/es/precios')).toBe('/es/pricing');
    expect(run('output', '/es/pricing')).toBe('/es/precios');
    expect(run('input', '/es/sobre-nosotros')).toBe('/es/about');
    expect(run('output', '/es/about')).toBe('/es/sobre-nosotros');
    expect(run('input', '/es/aviso-legal')).toBe('/es/legal-notice');
    expect(run('output', '/es/legal-notice')).toBe('/es/aviso-legal');
  });

  it('keeps the query', () => {
    expect(run('input', '/es/privacidad?x=1')).toBe('/es/privacy?x=1');
    expect(run('output', '/es/privacy?x=1')).toBe('/es/privacidad?x=1');
  });

  it.each([
    '/',
    '/pricing',
    '/about',
    '/privacy',
    '/cookies',
    '/es',
    '/es/cookies',
    '/precios',
    '/sobre-nosotros',
    '/robots.txt',
    '/_serverFn/x',
    '/es/nope',
    '/privacidad',
    '/aviso-legal',
    '/legal-notice',
  ])('passes %s through untouched', (path) => {
    expect(run('input', path)).toBe(path);
    expect(run('output', path)).toBe(path);
  });
});

describe('createRewrite with an English slug that differs from the route', () => {
  const entry: PageEntry = {
    slugs: { en: '/privacy-policy', es: '/privacidad' },
    route: '/privacy',
    lastmod: '2026-10-30',
  };
  const custom = createRewrite([entry]);

  function swap(direction: 'input' | 'output', path: string): string {
    const result = custom[direction]?.({ url: new URL(`${ORIGIN}${path}`) });
    return result instanceof URL ? result.pathname : path;
  }

  it('rewrites the unprefixed English slug to the route and back', () => {
    expect(swap('input', '/privacy-policy')).toBe('/privacy');
    expect(swap('output', '/privacy')).toBe('/privacy-policy');
  });

  it('rewrites the Spanish slug to the same route', () => {
    expect(swap('input', '/es/privacidad')).toBe('/es/privacy');
    expect(swap('output', '/es/privacy')).toBe('/es/privacidad');
  });

  it.each(['/privacy-policy', '/es/privacidad'])('round-trips %s', (path) => {
    expect(swap('output', swap('input', path))).toBe(path);
  });
});
