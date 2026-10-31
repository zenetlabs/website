import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Cases } from '@/components/cases';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('Cases (%s)', (locale, home) => {
  it('renders two cards without metric tiles while every value is unset', () => {
    const { container } = render(<Cases copy={home.cases} locale={locale} />);
    expect(container.querySelectorAll('h3')).toHaveLength(2);
    expect(container.querySelector('dl')).toBeNull();
    for (const item of home.cases.items) {
      for (const metric of item.metrics) {
        expect(container.textContent).not.toContain(metric.label);
      }
    }
  });

  it('links only the Viatsy card, to its case page by name', () => {
    const { container } = render(<Cases copy={home.cases} locale={locale} />);
    const links = [...container.querySelectorAll('a')];
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      'href',
      locale === 'en' ? '/case-studies/viatsy' : '/es/casos/viatsy',
    );
    expect(links[0]?.textContent).toBe(
      `${locale === 'en' ? 'Viatsy case study' : 'Caso de Viatsy'} →`,
    );
    expect(links[0]?.closest('li')?.querySelector('h3')?.textContent).toBe(
      'Viatsy',
    );
  });

  it('shows a metric once it has a value', () => {
    const [first, ...rest] = home.cases.items;
    if (!first) throw new Error('no case');
    const copy = {
      ...home.cases,
      items: [
        {
          ...first,
          metrics: [
            { id: 'hours', label: 'Hours saved', value: 12, unit: ' h' },
          ],
        },
        ...rest,
      ],
    };
    render(<Cases copy={copy} locale={locale} />);
    expect(screen.getByText('12 h')).toBeInTheDocument();
    expect(screen.getByText('Hours saved')).toBeInTheDocument();
    expect(document.querySelectorAll('dl')).toHaveLength(1);
  });
});
