import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseStudyPage } from '@/components/case-study-page';
import es from '@/i18n/es.json';
import { locales } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { titleText } from '@/lib/title-text';
import { DESK_CLOSE } from '../../test/inner-content';
import { HUB, METRICS, VIATSY } from '../../test/landing';

const route = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: route.locale }),
}));

const PUBLISHED = VIATSY.en.published;

function view(
  locale: 'en' | 'es',
  lastmod = PUBLISHED,
  metrics = METRICS[locale],
) {
  route.locale = locale;
  return render(
    <CaseStudyPage
      locale={locale}
      copy={VIATSY[locale]}
      hub={HUB[locale]}
      metrics={metrics}
      lastmod={lastmod}
      close={DESK_CLOSE[locale]}
    />,
  );
}

const HERO = 'section[aria-labelledby="page-title"]';

describe.each(locales)('CaseStudyPage (%s)', (locale) => {
  const copy = VIATSY[locale];

  it('renders one h1 with the title and no image or script', () => {
    const { container } = view(locale);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(titleText(copy.title));
    expect(container.querySelectorAll('img, script')).toHaveLength(0);
  });

  it('opens with the breadcrumb, the Viatsy logo, the title and the one sentence', () => {
    const { container } = view(locale);
    const hero = container.querySelector(HERO);
    const steps = [...(hero?.querySelectorAll('nav ol > li') ?? [])];
    expect(steps).toHaveLength(3);
    expect(steps[2]?.querySelector('[aria-current="page"]')).not.toBeNull();
    expect(hero?.querySelector('.case-mark .logo')).not.toBeNull();
    expect(hero).toHaveTextContent('Viatsy');
    expect(hero?.querySelector('p.text-lead')?.textContent).toBe(copy.lead);
  });

  it('shows the publication date once while nothing was updated', () => {
    const { container } = view(locale);
    const times = [...container.querySelectorAll('time')];
    expect(times).toHaveLength(1);
    expect(times[0]).toHaveAttribute('datetime', copy.published);
    expect(times[0]?.textContent).toBe('31/10/2026');
  });

  it('shows the update date too once the page was modified later, without a dot', () => {
    const { container } = view(locale, '2026-11-05');
    const times = [...container.querySelectorAll('time')];
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual([
      copy.published,
      '2026-11-05',
    ]);
    expect(times[1]?.textContent).toBe('05/11/2026');
    const dates = container.querySelector('.case-dates');
    expect(dates?.textContent).toContain(copy.labels.updated);
    expect(dates?.textContent).not.toContain('·');
  });

  it('renders no metrics while every value is unset and no placeholder text', () => {
    const { container } = view(
      locale,
      PUBLISHED,
      METRICS[locale].map((metric) => ({ ...metric, value: null })),
    );
    expect(container.querySelector('#results dl')).toBeNull();
    expect(container.textContent).not.toMatch(/\[X\]|null|undefined/);
    for (const metric of METRICS[locale]) {
      expect(container.textContent).not.toContain(metric.label);
    }
  });

  it('shows the estimated figure, labelled as an estimate, and hides the unset one', () => {
    const { container } = view(locale);
    const [hours, reply] = METRICS[locale];
    const results = container.querySelector('#results');
    expect(results?.querySelectorAll('dl > div')).toHaveLength(1);
    expect(results).toHaveTextContent(hours?.label ?? '');
    expect(results?.querySelector('dd')?.textContent).toBe(
      `8 h ${hours?.estimate}`,
    );
    expect(results).not.toHaveTextContent(reply?.label ?? '');
  });

  it('shows a metric once it has a value', () => {
    view(locale, PUBLISHED, [
      { id: 'hours', label: 'Hours saved', value: 12, unit: ' h' },
    ]);
    expect(screen.getByText('12 h')).toBeInTheDocument();
    expect(screen.getByText('Hours saved')).toBeInTheDocument();
  });

  it('puts the facts in the hero and the intro first in the problem', () => {
    const { container } = view(locale);
    expect(container.querySelectorAll(`${HERO} dl dt`)).toHaveLength(
      copy.facts.length,
    );
    expect(container.querySelector('#problem p.text-lead')?.textContent).toBe(
      copy.intro,
    );
  });

  it('lists six built rows with tools, and a four-step rail with no stub', () => {
    const { container } = view(locale);
    expect(container.querySelectorAll('#built h3')).toHaveLength(6);
    expect(container.querySelectorAll('#built .ledger-tiles')).toHaveLength(6);
    expect(container.querySelectorAll('#operations .rail > li')).toHaveLength(
      4,
    );
    expect(container.querySelector('#operations [data-stub]')).toBeNull();
    expect(container.querySelectorAll('#results ul > li')).toHaveLength(
      copy.results.points.length,
    );
  });
});

describe.each(locales)('CaseStudyPage flow and close (%s)', (locale) => {
  it('plays the supplier-confirmation flow as the hero board', () => {
    const { container } = view(locale);
    const copy = VIATSY[locale];
    const steps = [
      ...container.querySelectorAll(`${HERO} [data-flow-board] ol > li`),
    ];
    expect(steps.map((step) => step.getAttribute('data-actor'))).toEqual(
      copy.flow.steps.map((step) => step.actor),
    );
    const ids = [...container.querySelectorAll('section[id]')].map(
      (section) => section.id,
    );
    expect(ids.indexOf('operations')).toBe(ids.indexOf('built') + 1);
    expect(container.querySelectorAll('[data-sticky-cta]')).toHaveLength(1);
  });

  it('closes with the desk: the write door and its own two suggestions', () => {
    const { container } = view(locale);
    const close = container.querySelector('#contact');
    expect(close?.querySelector('a[data-cta="close_contact"]')).toHaveAttribute(
      'href',
      navHref(locale, { page: 'contact' }),
    );
    expect(close?.querySelectorAll('.desk-chip').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-cta="page_cta"]')).toBeNull();
  });
});

describe('case-study-page sticky bar', () => {
  it('is localised for es', () => {
    const { container } = view('es');
    const link = container.querySelector('[data-sticky-cta] a');
    expect(link?.textContent).toBe(es.nav.cta);
    expect(link).toHaveAttribute('href', navHref('es', CTA_TARGET));
  });
});
