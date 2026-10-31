import { describe, expect, it } from 'vitest';
import type { ServiceId } from '@/content/types';
import { locales } from '@/lib/i18n';
import {
  breadcrumbTrail,
  createRewrite,
  HOLDED_PAGE_IDS,
  hasLocale,
  isLandingPage,
  isServicePage,
  LANDING_PAGE_IDS,
  markdownPath,
  PAGE_IDS,
  PAGES,
  type PageEntry,
  type PageId,
  pageForSlug,
  pageLocales,
  pagePath,
  pagesForService,
  pagesIn,
  localizedRewrite as rewrite,
  routeOf,
  SERVICE_PAGE_IDS,
  serviceHref,
  serviceOf,
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
    expect(pageForSlug('/services')).toBe('services');
    expect(pageForSlug('/servicios')).toBe('services');
    expect(pageForSlug('/services/ai-agents')).toBe('agents');
    expect(pageForSlug('/servicios/agentes-de-ia')).toBe('agents');
    expect(pageForSlug('/legal-notice')).toBe('legalNotice');
    expect(pageForSlug('/aviso-legal')).toBe('legalNotice');
    expect(pageForSlug('/verifactu')).toBe('verifactu');
    expect(pageForSlug('/verifactu-integracion')).toBe('verifactu');
    expect(pageForSlug('/sectores/agencias-de-viaje')).toBe('travelAgencies');
    expect(pageForSlug('/industries/travel-agencies')).toBe('travelAgencies');
    expect(pageForSlug('/casos/viatsy')).toBe('viatsyCase');
    expect(pageForSlug('/case-studies/viatsy')).toBe('viatsyCase');
    expect(pageForSlug('/servicios/integraciones/holded-hubspot')).toBe(
      'holdedHubspot',
    );
    expect(pageForSlug('/services/integrations/holded-hubspot')).toBe(
      'holdedHubspot',
    );
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
    ['services', ['en', 'es']],
    ['automation', ['en', 'es']],
    ['integrations', ['en', 'es']],
    ['agents', ['en', 'es']],
    ['software', ['en', 'es']],
    ['training', ['en', 'es']],
    ['holdedPrestashop', ['es']],
    ['holdedWoocommerce', ['es']],
    ['holdedHubspot', ['es']],
    ['verifactu', ['es']],
    ['travelAgencies', ['es']],
    ['viatsyCase', ['en', 'es']],
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
    expect(pagesIn('en')).toHaveLength(12);
    expect(pagesIn('es')).toHaveLength(18);
    expect(pagesIn('en')).toEqual([
      'home',
      'services',
      ...SERVICE_PAGE_IDS,
      'viatsyCase',
      'pricing',
      'about',
      'privacy',
      'cookies',
    ]);
    expect(pagesIn('es')).toEqual([
      'home',
      'services',
      ...SERVICE_PAGE_IDS,
      ...LANDING_PAGE_IDS,
      'viatsyCase',
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
    ['en', 'services', '/services'],
    ['en', 'automation', '/services/ai-automation'],
    ['en', 'integrations', '/services/integrations'],
    ['en', 'agents', '/services/ai-agents'],
    ['en', 'software', '/services/custom-software'],
    ['en', 'training', '/services/ai-training'],
    ['en', 'holdedHubspot', '/es/servicios/integraciones/holded-hubspot'],
    ['en', 'verifactu', '/es/verifactu-integracion'],
    ['en', 'viatsyCase', '/case-studies/viatsy'],
    ['en', 'pricing', '/pricing'],
    ['en', 'about', '/about'],
    ['en', 'privacy', '/privacy'],
    ['en', 'cookies', '/cookies'],
    ['en', 'legalNotice', '/es/aviso-legal'],
    ['es', 'home', '/es'],
    ['es', 'services', '/es/servicios'],
    ['es', 'automation', '/es/servicios/automatizacion-de-procesos'],
    ['es', 'integrations', '/es/servicios/integraciones'],
    ['es', 'agents', '/es/servicios/agentes-de-ia'],
    ['es', 'software', '/es/servicios/desarrollo-de-software-a-medida'],
    ['es', 'training', '/es/servicios/formacion-ia-equipos'],
    ['es', 'holdedPrestashop', '/es/servicios/integraciones/holded-prestashop'],
    [
      'es',
      'holdedWoocommerce',
      '/es/servicios/integraciones/holded-woocommerce',
    ],
    ['es', 'holdedHubspot', '/es/servicios/integraciones/holded-hubspot'],
    ['es', 'verifactu', '/es/verifactu-integracion'],
    ['es', 'travelAgencies', '/es/sectores/agencias-de-viaje'],
    ['es', 'viatsyCase', '/es/casos/viatsy'],
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
    ['en', 'holdedPrestashop', '?a=1', '/services/integrations'],
    ['en', 'holdedWoocommerce', '', '/services/integrations'],
    ['en', 'holdedHubspot', '', '/services/integrations'],
    [
      'es',
      'holdedHubspot',
      '?a=1',
      '/es/servicios/integraciones/holded-hubspot?a=1',
    ],
    ['en', 'verifactu', '', '/'],
    ['en', 'travelAgencies', '', '/'],
    ['en', 'viatsyCase', '?a=1', '/case-studies/viatsy?a=1'],
    ['es', 'viatsyCase', '?a=1', '/es/casos/viatsy?a=1'],
  ] as const)('to %s from %s%s is %s', (target, page, search, expected) => {
    expect(switchHref(target, page, search)).toBe(expected);
  });
});

describe('switchHref to a locale without the page', () => {
  it('goes to the parent when the parent exists there, else home', () => {
    for (const page of PAGE_IDS) {
      if (hasLocale(page, 'en')) continue;
      const { parent } = PAGES[page];
      const expected =
        parent && hasLocale(parent, 'en')
          ? pagePath('en', parent)
          : pagePath('en', 'home');
      expect(switchHref('en', page, '?x=1'), page).toBe(expected);
    }
  });

  it('only the Holded pairs have a parent that exists in English', () => {
    expect(
      PAGE_IDS.filter((page) => {
        const { parent } = PAGES[page];
        return !hasLocale(page, 'en') && parent && hasLocale(parent, 'en');
      }),
    ).toEqual([...HOLDED_PAGE_IDS]);
  });
});

describe('routeOf', () => {
  it('defaults to the English slug and honours an explicit route', () => {
    expect(routeOf('privacy')).toBe('/privacy');
    expect(routeOf('home')).toBe('/');
    expect(routeOf('legalNotice')).toBe('/legal-notice');
    expect(routeOf('verifactu')).toBe('/verifactu');
    expect(routeOf('travelAgencies')).toBe('/industries/travel-agencies');
    expect(routeOf('holdedHubspot')).toBe(
      '/services/integrations/holded-hubspot',
    );
    expect(routeOf('viatsyCase')).toBe('/case-studies/viatsy');
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
    expect(run('input', '/es/servicios')).toBe('/es/services');
    expect(run('output', '/es/services')).toBe('/es/servicios');
    expect(run('input', '/es/servicios/agentes-de-ia')).toBe(
      '/es/services/ai-agents',
    );
    expect(run('output', '/es/services/ai-agents')).toBe(
      '/es/servicios/agentes-de-ia',
    );
    expect(run('input', '/es/aviso-legal')).toBe('/es/legal-notice');
    expect(run('output', '/es/legal-notice')).toBe('/es/aviso-legal');
    expect(run('input', '/es/servicios/integraciones/holded-hubspot')).toBe(
      '/es/services/integrations/holded-hubspot',
    );
    expect(run('output', '/es/services/integrations/holded-hubspot')).toBe(
      '/es/servicios/integraciones/holded-hubspot',
    );
    expect(run('input', '/es/verifactu-integracion')).toBe('/es/verifactu');
    expect(run('output', '/es/verifactu')).toBe('/es/verifactu-integracion');
    expect(run('input', '/es/sectores/agencias-de-viaje')).toBe(
      '/es/industries/travel-agencies',
    );
    expect(run('input', '/es/casos/viatsy')).toBe('/es/case-studies/viatsy');
    expect(run('output', '/es/case-studies/viatsy')).toBe('/es/casos/viatsy');
    expect(run('input', '/case-studies/viatsy')).toBe('/case-studies/viatsy');
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
    '/services',
    '/services/ai-agents',
    '/servicios',
    '/es',
    '/es/cookies',
    '/precios',
    '/sobre-nosotros',
    '/robots.txt',
    '/_serverFn/x',
    '/api/lead',
    '/internal/leads',
    '/internal/leads.csv',
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

describe('markdownPath', () => {
  it.each([
    ['en', 'home', '/index.md'],
    ['es', 'home', '/es.md'],
    ['en', 'pricing', '/pricing.md'],
    ['es', 'pricing', '/es/precios.md'],
    ['en', 'automation', '/services/ai-automation.md'],
    ['es', 'services', '/es/servicios.md'],
    ['es', 'about', '/es/sobre-nosotros.md'],
    ['es', 'legalNotice', '/es/aviso-legal.md'],
  ] as const)('%s %s is %s', (locale, page, expected) => {
    expect(markdownPath(locale, page)).toBe(expected);
  });
});

describe('service pages', () => {
  const SERVICE_PAGES = [
    'automation',
    'integrations',
    'agents',
    'software',
    'training',
  ] as const;

  it('derives the service pages from the entries that name a service', () => {
    expect(SERVICE_PAGE_IDS).toEqual(SERVICE_PAGES);
    expect(PAGE_IDS.filter(isServicePage)).toEqual(SERVICE_PAGES);
    for (const page of PAGE_IDS) {
      expect(isServicePage(page), page).toBe(
        SERVICE_PAGES.some((id) => id === page),
      );
    }
  });

  it('lists the ladder row each service page prices from', () => {
    expect(SERVICE_PAGE_IDS.map(serviceOf)).toEqual([
      'integration',
      'integration',
      'agent',
      'web',
      'training',
    ]);
    for (const page of SERVICE_PAGES) {
      expect(PAGES[page].parent).toBe('services');
    }
  });

  it.each([
    ['integration', ['automation', 'integrations']],
    ['agent', ['agents']],
    ['web', ['software']],
    ['training', ['training']],
    ['diagnostic', []],
    ['maintenance', []],
    ['growth', []],
  ] as const)('lists the pages of %s', (id, expected) => {
    expect(pagesForService(id)).toEqual(expected);
  });

  it.each([
    ['diagnostic', '/pricing#diagnostic', '/es/precios#diagnostic'],
    [
      'integration',
      '/services/ai-automation',
      '/es/servicios/automatizacion-de-procesos',
    ],
    ['agent', '/services/ai-agents', '/es/servicios/agentes-de-ia'],
    [
      'web',
      '/services/custom-software',
      '/es/servicios/desarrollo-de-software-a-medida',
    ],
    ['training', '/services/ai-training', '/es/servicios/formacion-ia-equipos'],
    ['maintenance', '/pricing#maintenance', '/es/precios#maintenance'],
    ['growth', '/pricing#growth', '/es/precios#growth'],
  ] as const satisfies readonly (readonly [ServiceId, string, string])[])(
    'links %s to its first page or its pricing card',
    (id, en, es) => {
      expect(serviceHref('en', id)).toBe(en);
      expect(serviceHref('es', id)).toBe(es);
    },
  );
});

describe('landing pages', () => {
  it('prices every landing page from the integration ladder row', () => {
    expect(LANDING_PAGE_IDS).toEqual([
      ...HOLDED_PAGE_IDS,
      'verifactu',
      'travelAgencies',
    ]);
    for (const page of LANDING_PAGE_IDS) {
      expect(isServicePage(page), page).toBe(false);
      expect(serviceOf(page), page).toBe('integration');
      expect(isLandingPage(page)).toBe(true);
    }
    expect(PAGE_IDS.filter(isLandingPage)).toEqual([...LANDING_PAGE_IDS]);
  });

  it('keeps landing pages off the service ladder', () => {
    expect(SERVICE_PAGE_IDS).not.toContain('verifactu');
    expect(pagesForService('integration')).toEqual([
      'automation',
      'integrations',
    ]);
    for (const page of PAGE_IDS) {
      if (isServicePage(page)) expect(PAGES[page].kind).toBe('service');
      else expect(PAGES[page].kind).toBeUndefined();
    }
  });
});

describe('breadcrumbTrail', () => {
  it('walks the parents up to the home page', () => {
    expect(breadcrumbTrail('home')).toEqual(['home']);
    expect(breadcrumbTrail('pricing')).toEqual(['home', 'pricing']);
    expect(breadcrumbTrail('services')).toEqual(['home', 'services']);
    for (const page of SERVICE_PAGE_IDS) {
      expect(breadcrumbTrail(page)).toEqual(['home', 'services', page]);
    }
  });

  it('puts the Holded pairs under integrations and the rest under home', () => {
    for (const page of HOLDED_PAGE_IDS) {
      expect(breadcrumbTrail(page)).toEqual([
        'home',
        'services',
        'integrations',
        page,
      ]);
    }
    expect(breadcrumbTrail('verifactu')).toEqual(['home', 'verifactu']);
    expect(breadcrumbTrail('travelAgencies')).toEqual([
      'home',
      'travelAgencies',
    ]);
    expect(breadcrumbTrail('viatsyCase')).toEqual(['home', 'viatsyCase']);
  });
});
