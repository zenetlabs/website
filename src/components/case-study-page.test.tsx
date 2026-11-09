import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseStudyPage } from '@/components/case-study-page';
import es from '@/i18n/es.json';
import { locales } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { titleText } from '@/lib/title-text';
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
    />,
  );
}

describe.each(locales)('CaseStudyPage (%s)', (locale) => {
  const copy = VIATSY[locale];

  it('renders one h1 with the title and no image', () => {
    const { container } = view(locale);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(titleText(copy.title));
    expect(container.querySelectorAll('img, script')).toHaveLength(0);
  });

  it('shows the publication date once while nothing was updated', () => {
    const { container } = view(locale);
    const times = [...container.querySelectorAll('time')];
    expect(times).toHaveLength(1);
    expect(times[0]).toHaveAttribute('datetime', copy.published);
    expect(times[0]?.textContent).toBe('31/10/2026');
  });

  it('shows the update date too once the page was modified later', () => {
    const { container } = view(locale, '2026-11-05');
    const times = [...container.querySelectorAll('time')];
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual([
      copy.published,
      '2026-11-05',
    ]);
    expect(times[1]?.textContent).toBe('05/11/2026');
    expect(container.textContent).toContain(copy.labels.updated);
  });

  it('renders no metrics while every value is unset and no placeholder text', () => {
    const { container } = view(locale);
    expect(container.querySelector('#results dl')).toBeNull();
    expect(container.textContent).not.toMatch(/\[X\]|null|undefined/);
    for (const metric of METRICS[locale]) {
      expect(container.textContent).not.toContain(metric.label);
    }
  });

  it('shows a metric once it has a value', () => {
    view(locale, PUBLISHED, [
      { id: 'hours', label: 'Hours saved', value: 12, unit: ' h' },
    ]);
    expect(screen.getByText('12 h')).toBeInTheDocument();
    expect(screen.getByText('Hours saved')).toBeInTheDocument();
  });

  it('lists the facts, six built items and a four-step timeline', () => {
    const { container } = view(locale);
    expect(container.querySelectorAll('header dl dt')).toHaveLength(
      copy.facts.length,
    );
    expect(container.querySelectorAll('#built h3')).toHaveLength(6);
    expect(
      container.querySelectorAll('#operations .timeline > li'),
    ).toHaveLength(4);
    expect(container.querySelectorAll('#results ul > li')).toHaveLength(
      copy.results.points.length,
    );
  });
});

describe.each(locales)('CaseStudyPage flow (%s)', (locale) => {
  it('draws the supplier-confirmation flow in the header, beside the title', () => {
    const { container } = view(locale);
    const copy = VIATSY[locale];
    const steps = [...container.querySelectorAll('header #flow ol > li')];
    expect(steps).toHaveLength(copy.flow.steps.length);
    expect(steps.map((step) => step.getAttribute('data-actor'))).toEqual(
      copy.flow.steps.map((step) => step.actor),
    );
    expect(container.querySelector('header .logo')).not.toBeNull();
    expect(container.querySelector('header')).toHaveTextContent('Viatsy');
    const ids = [...container.querySelectorAll('section[id]')].map(
      (section) => section.id,
    );
    expect(ids.indexOf('operations')).toBe(ids.indexOf('built') + 1);
    expect(container.querySelectorAll('[data-sticky-cta]')).toHaveLength(1);
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
