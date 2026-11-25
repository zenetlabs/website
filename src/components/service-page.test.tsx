import { cleanup, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServicePage } from '@/components/service-page';
import es from '@/i18n/es.json';
import { faqChips } from '@/lib/faq-chips';
import { type Locale, locales } from '@/lib/i18n';
import { formatPrice, formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, contactWithMessage, navHref } from '@/lib/nav';
import {
  pagePath,
  SERVICE_PAGE_IDS,
  type ServicePageId,
  serviceOf,
} from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { titleText } from '@/lib/title-text';
import { DESK_CLOSE, INCLUDES } from '../../test/inner-content';
import { SERVICES } from '../../test/page-content';
import { SERVICE_BODIES } from '../../test/service-bodies';

const route = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: route.locale }),
}));

const CASES = locales.flatMap((locale) =>
  (['automation', 'training'] as const).map((page) => [locale, page] as const),
);

function view(locale: Locale, page: ServicePageId) {
  route.locale = locale;
  const { hub, pages } = SERVICE_BODIES[locale];
  const copy = pages[page];
  const labels = SERVICE_BODIES[locale].hub.labels;
  const services = SERVICES[locale];
  const { container } = render(
    <ServicePage
      page={page}
      locale={locale}
      copy={copy}
      hub={hub}
      services={services}
      includes={INCLUDES[locale][serviceOf(page)]}
      close={DESK_CLOSE[locale]}
    />,
  );
  return { container, copy, labels, services, hub };
}

describe.each(CASES)('ServicePage (%s %s)', (locale, page) => {
  it('renders one h1 with the title of the page', () => {
    const { copy } = view(locale, page);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(titleText(copy.hero.title));
  });

  it('links the breadcrumb through the hub and marks the current page', () => {
    const { labels, hub } = view(locale, page);
    const trail = screen.getByRole('navigation', { name: labels.breadcrumb });
    const links = within(trail).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      pagePath(locale, 'home'),
      pagePath(locale, 'services'),
    ]);
    const current = trail.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe(hub.cards[page].name);
  });

  it('sets the offer as a ticket with the computed price, the timeline, who and the first step', () => {
    const { container, copy, labels, services } = view(locale, page);
    const ticket = container.querySelector<HTMLElement>('.price-ticket');
    const service = services[serviceOf(page)];
    expect(ticket?.dataset.service).toBe(service.id);
    expect(ticket?.textContent).toContain(service.name);
    expect(ticket?.textContent).toContain(labels.taxNote);
    expect(ticket?.querySelector('.sr-only')?.textContent).toBe(
      formatPrice(locale, service.prices[0]),
    );
    if (service.prices.length > 1) {
      expect(ticket?.textContent).toContain(
        formatPriceSummary(locale, service.prices),
      );
    }
    expect(
      [...(ticket?.querySelectorAll('dt') ?? [])].map((dt) => dt.textContent),
    ).toEqual([labels.timeline, labels.who]);
    expect(ticket?.querySelector('.ticket-offer')?.textContent).toContain(
      copy.facts.timeline,
    );
    expect(ticket?.querySelector('.ticket-offer')?.textContent).toContain(
      copy.facts.who,
    );
    const stub = ticket?.querySelector('.ticket-stub');
    expect(stub?.textContent).toContain(labels.start);
    expect(stub?.textContent).toContain(copy.facts.start);
  });

  it('lists what the ladder row includes beside the ticket', () => {
    const { container, labels } = view(locale, page);
    const aside = container.querySelector('.inner-hero-aside');
    expect(aside?.textContent).toContain(labels.included);
    expect(
      [...(aside?.querySelectorAll('li') ?? [])].map((li) => li.textContent),
    ).toEqual([...INCLUDES[locale][serviceOf(page)]]);
  });

  it('points the call to action and the pricing link at their targets', () => {
    const { copy, labels } = view(locale, page);
    const [button] = screen.getAllByRole('link', { name: copy.cta.button });
    expect(button).toHaveAttribute('href', navHref(locale, CTA_TARGET));
    expect(button).toHaveAttribute('data-cta', 'page_hero');
    expect(screen.getByRole('link', { name: labels.pricing })).toHaveAttribute(
      'href',
      pagePath(locale, 'pricing'),
    );
  });

  it('renders four collapsed questions with anchors and no script', () => {
    const { container, copy } = view(locale, page);
    const details = [...container.querySelectorAll('details')];
    expect(details.map((item) => item.id)).toEqual(
      copy.faq.items.map((item) => `faq-${item.id}`),
    );
    expect(details).toHaveLength(4);
    expect(details.some((item) => item.open)).toBe(false);
    expect(container.querySelectorAll('script')).toHaveLength(0);
  });

  it('links the two related pages and the hub, and the email', () => {
    const { container, copy, labels } = view(locale, page);
    const related = screen.getByRole('heading', { name: labels.related });
    const links = within(related.parentElement ?? container).getAllByRole(
      'link',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      ...copy.related.map((target) => pagePath(locale, target)),
      pagePath(locale, 'services'),
    ]);
    expect(screen.getByRole('link', { name: PUBLIC_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${PUBLIC_EMAIL}`,
    );
  });

  it('shows no image and keeps the process to four steps', () => {
    const { container, copy } = view(locale, page);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('.rail > li')).toHaveLength(4);
    expect(
      container.querySelector('.rail > li:first-child')?.textContent,
    ).toContain(copy.how.steps[0].label);
  });
});

describe('ServicePage links', () => {
  it('sends training to the pricing page and a workshop label', () => {
    const { copy } = view('en', 'training');
    expect(copy.cta.button).toBe('Ask about a workshop');
    expect(screen.getByRole('link', { name: 'See pricing' })).toHaveAttribute(
      'href',
      '/pricing',
    );
  });

  it('links the case, the cases hub and the diagnostic from a service page', () => {
    view('en', 'training');
    const callout = document.querySelector('#case');
    expect(callout?.querySelector('a[href="/case-studies"]')).not.toBeNull();
    expect(
      document.querySelector(
        '#related-title ~ ul a[href="/services/automation-diagnostic"]',
      ),
    ).not.toBeNull();
  });

  it('sends automation to the pricing page', () => {
    view('es', 'automation');
    expect(screen.getByRole('link', { name: 'Ver precios' })).toHaveAttribute(
      'href',
      '/es/precios',
    );
  });
});

describe('ServicePage links into R5 pages', () => {
  it('links the three Spanish pair headings and leaves the rest as text', () => {
    const { container } = view('es', 'integrations');
    const headings = [...container.querySelectorAll('#use-cases h3')];
    expect(headings).toHaveLength(4);
    expect(
      headings.map((heading) =>
        heading.querySelector('a')?.getAttribute('href'),
      ),
    ).toEqual([
      '/es/servicios/integraciones/holded-prestashop',
      '/es/servicios/integraciones/holded-woocommerce',
      '/es/servicios/integraciones/holded-hubspot',
      undefined,
    ]);
    expect(headings[0]?.textContent).toBe('Holded y PrestaShop');
  });

  it('links no use case from the English integrations page', () => {
    const { container } = view('en', 'integrations');
    expect(container.querySelectorAll('#use-cases a')).toHaveLength(0);
  });

  it.each([
    ['en', 'automation', '/case-studies/viatsy', 'Viatsy case study'],
    ['en', 'agents', '/case-studies/viatsy', 'Viatsy case study'],
    ['es', 'automation', '/es/casos/viatsy', 'Caso de Viatsy'],
    ['es', 'agents', '/es/casos/viatsy', 'Caso de Viatsy'],
  ] as const)('links the case page from %s %s', (locale, page, href, text) => {
    view(locale, page);
    expect(screen.getByRole('link', { name: text })).toHaveAttribute(
      'href',
      href,
    );
  });

  it('links only the cases hub from a page without a case page', () => {
    const { container } = view('en', 'training');
    const links = [...container.querySelectorAll('#case a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/case-studies',
    ]);
  });
});

describe('ServicePage flow and approval', () => {
  it.each(
    locales.flatMap((locale) =>
      SERVICE_PAGE_IDS.map((page) => [locale, page] as const),
    ),
  )('draws the three-step board in the hero on %s %s', (locale, page) => {
    const { container, copy, hub } = view(locale, page);
    const hero = container.querySelector(
      'section[aria-labelledby="page-title"]',
    );
    const steps = [...(hero?.querySelectorAll('ol.fb-lane > li') ?? [])];
    expect(steps).toHaveLength(3);
    expect(
      steps.map((step) => step.querySelector('.fb-step')?.textContent),
    ).toEqual(copy.flow?.steps.map((step) => step.label));
    for (const [index, step] of steps.entries()) {
      const actor = copy.flow?.steps[index]?.actor;
      expect(step.getAttribute('data-actor')).toBe(actor);
      expect(step.textContent).toContain(actor ? hub.labels.actors[actor] : '');
    }
    expect(hero?.querySelector('figcaption')?.textContent).toBe(
      copy.flow?.caption,
    );
    expect(hero?.querySelectorAll('.fb-hop')).toHaveLength(2);
  });

  it('shows the approval card under the board on agents only', () => {
    const agents = view('en', 'agents');
    expect(agents.container.querySelector('.fb-after')).toHaveTextContent(
      'Needs your approval',
    );
    cleanup();
    for (const page of ['automation', 'integrations'] as const) {
      const { container } = view('en', page);
      expect(container.textContent).not.toContain('Needs your approval');
      cleanup();
    }
  });
});

describe('ServicePage layout', () => {
  it('opens the first section with the rest of the old lead', () => {
    const { container, copy } = view('en', 'agents');
    expect(container.querySelector('#use-cases')?.textContent).toContain(
      copy.hero.intro,
    );
    expect(container.querySelector('.inner-hero-copy')?.textContent).toContain(
      copy.hero.lead,
    );
    expect(
      container.querySelector('.inner-hero-copy')?.textContent,
    ).not.toContain(copy.hero.intro);
  });

  it('puts the sticky bar after the related links and before the closing desk', () => {
    const { container } = view('en', 'automation');
    const bar = container.querySelector('[data-sticky-cta]');
    const related = container.querySelector('#related-title');
    const close = container.querySelector('section.band#contact');
    expect(bar).not.toBeNull();
    expect(related?.compareDocumentPosition(bar as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(bar?.compareDocumentPosition(close as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe('ServicePage close', () => {
  it.each(locales)(
    'closes with the desk: the write door and the first two questions (%s)',
    (locale) => {
      const { container, copy } = view(locale, 'agents');
      const close = container.querySelector('#contact');
      const door = close?.querySelector('a[data-cta="close_contact"]');
      expect(door).toHaveAttribute(
        'href',
        navHref(locale, { page: 'contact' }),
      );
      const [first, second] = copy.faq.items;
      const chips = [...(close?.querySelectorAll('.desk-chip') ?? [])];
      expect(chips.map((chip) => chip.getAttribute('href'))).toEqual([
        contactWithMessage(locale, first?.question ?? ''),
        contactWithMessage(locale, second?.question ?? ''),
      ]);
      expect(faqChips(copy.faq.items)).toEqual([
        first?.question,
        second?.question,
      ]);
      expect(close?.querySelector('[data-page-chips]')).not.toBeNull();
      expect(container.querySelector('[data-cta="page_cta"]')).toBeNull();
    },
  );
});

describe('service-page sticky bar', () => {
  it('is localised for es', () => {
    const { container } = view('es', 'automation');
    const link = container.querySelector('[data-sticky-cta] a');
    expect(link?.textContent).toBe(es.nav.cta);
    expect(link).toHaveAttribute('href', navHref('es', CTA_TARGET));
  });
});
