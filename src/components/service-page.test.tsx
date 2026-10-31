import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServicePage } from '@/components/service-page';
import { type Locale, locales, messages } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath, type ServicePageId, serviceOf } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { titleText } from '@/lib/title-text';
import { SERVICES } from '../../test/page-content';
import { SERVICE_BODIES } from '../../test/service-bodies';

const CASES = locales.flatMap((locale) =>
  (['automation', 'training'] as const).map((page) => [locale, page] as const),
);

function view(locale: Locale, page: ServicePageId) {
  const { hub, pages } = SERVICE_BODIES[locale];
  const copy = pages[page];
  const labels = messages[locale].servicePage;
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
    ).toHaveAttribute(
      'href',
      `${pagePath(locale, 'pricing')}#${serviceOf(page)}`,
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
    const { container } = view(locale, page);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('.timeline > li')).toHaveLength(4);
  });
});

describe('ServicePage links', () => {
  it('sends training to its own pricing card and a workshop label', () => {
    const { copy } = view('en', 'training');
    expect(copy.cta.button).toBe('Ask about a workshop');
    expect(screen.getByRole('link', { name: 'See pricing →' })).toHaveAttribute(
      'href',
      '/pricing#training',
    );
  });

  it('sends automation to the integration card', () => {
    view('es', 'automation');
    expect(screen.getByRole('link', { name: 'Ver precios →' })).toHaveAttribute(
      'href',
      '/es/precios#integration',
    );
  });
});
