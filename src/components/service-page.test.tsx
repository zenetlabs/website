import { cleanup, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServicePage } from '@/components/service-page';
import es from '@/i18n/es.json';
import { type Locale, locales } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath, type ServicePageId, serviceOf } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { titleText } from '@/lib/title-text';
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

  it('lists who, price, timeline and first step with the computed price', () => {
    const { container, copy, labels, services } = view(locale, page);
    const list = container.querySelector('dl');
    expect(
      [...(list?.querySelectorAll('dt') ?? [])].map((dt) => dt.textContent),
    ).toEqual([labels.who, labels.price, labels.timeline, labels.start]);
    expect(
      [...(list?.querySelectorAll('dd') ?? [])].map((dd) => dd.textContent),
    ).toEqual([
      copy.facts.who,
      `${formatPriceSummary(locale, services[serviceOf(page)].prices)} (${labels.taxNote})`,
      copy.facts.timeline,
      copy.facts.start,
    ]);
  });

  it('points the call to action and the pricing link at their targets', () => {
    const { copy, labels } = view(locale, page);
    const buttons = screen.getAllByRole('link', { name: copy.cta.button });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    for (const button of buttons) {
      expect(button).toHaveAttribute('href', navHref(locale, CTA_TARGET));
    }
    expect(
      screen.getByRole('link', { name: `${labels.pricing} →` }),
    ).toHaveAttribute('href', pagePath(locale, 'pricing'));
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
    const { container } = view(locale, page);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('.timeline > li')).toHaveLength(4);
  });
});

describe('ServicePage links', () => {
  it('sends training to the pricing page and a workshop label', () => {
    const { copy } = view('en', 'training');
    expect(copy.cta.button).toBe('Ask about a workshop');
    expect(screen.getByRole('link', { name: 'See pricing →' })).toHaveAttribute(
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
    expect(screen.getByRole('link', { name: 'Ver precios →' })).toHaveAttribute(
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
    ['en', 'automation', '/case-studies/viatsy', 'Viatsy case study →'],
    ['en', 'agents', '/case-studies/viatsy', 'Viatsy case study →'],
    ['es', 'automation', '/es/casos/viatsy', 'Caso de Viatsy →'],
    ['es', 'agents', '/es/casos/viatsy', 'Caso de Viatsy →'],
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
      (['automation', 'integrations', 'agents'] as const).map(
        (page) => [locale, page] as const,
      ),
    ),
  )('draws the three-step flow with actor names on %s %s', (locale, page) => {
    const { container, copy, hub } = view(locale, page);
    const steps = [...container.querySelectorAll('#flow ol.flow > li')];
    expect(
      steps.map((step) => step.querySelector('p:last-child')?.textContent),
    ).toEqual(copy.flow?.steps.map((step) => step.label));
    for (const [index, step] of steps.entries()) {
      const actor = copy.flow?.steps[index]?.actor;
      expect(step.textContent).toContain(actor ? hub.labels.actors[actor] : '');
    }
  });

  it('shows the approval card on agents only', () => {
    const agents = view('en', 'agents');
    expect(
      agents.container.querySelector('#flow figure:nth-of-type(2)'),
    ).toHaveTextContent('Needs your approval');
    cleanup();
    for (const page of ['automation', 'integrations'] as const) {
      const { container } = view('en', page);
      expect(container.querySelectorAll('#flow figure')).toHaveLength(1);
      cleanup();
    }
  });

  it('has no flow section on a page without one', () => {
    const { container } = view('en', 'training');
    expect(container.querySelector('#flow')).toBeNull();
  });
});

describe('ServicePage layout', () => {
  it('highlights the price fact', () => {
    const { container, labels } = view('en', 'agents');
    const highlighted = container.querySelectorAll('.fact-highlight');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.querySelector('dt')?.textContent).toBe(labels.price);
  });

  it('puts the sticky bar after the related links and before the closing band', () => {
    const { container } = view('en', 'automation');
    const bar = container.querySelector('[data-sticky-cta]');
    const related = container.querySelector('#related-title');
    const band = container.querySelector('section.band');
    expect(bar).not.toBeNull();
    expect(related?.compareDocumentPosition(bar as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(bar?.compareDocumentPosition(band as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe('service-page sticky bar', () => {
  it('is localised for es', () => {
    const { container } = view('es', 'automation');
    const link = container.querySelector('[data-sticky-cta] a');
    expect(link?.textContent).toBe(es.nav.cta);
    expect(link).toHaveAttribute('href', navHref('es', CTA_TARGET));
  });
});
