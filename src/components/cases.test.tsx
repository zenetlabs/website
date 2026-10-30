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

  it('links nowhere from the cards', () => {
    const { container } = render(<Cases copy={home.cases} locale={locale} />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
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
