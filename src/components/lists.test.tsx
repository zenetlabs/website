import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BulletList, MetricList } from '@/components/lists';

describe('BulletList', () => {
  it('renders one marked item per line with the given spacing', () => {
    const { container } = render(
      <BulletList items={['one', 'two']} className="mt-6" />,
    );
    expect(container.querySelector('ul')?.className).toBe('mt-6 grid gap-3');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });
});

describe('MetricList', () => {
  const metrics = [
    { id: 'a', label: 'Unset', value: null, unit: ' h' },
    { id: 'b', label: 'Hours saved', value: 1200, unit: ' h' },
  ];

  it('shows only the measured metrics with locale formatting', () => {
    render(<MetricList metrics={metrics} locale="es" className="mt-6" />);
    expect(screen.getByText('1.200 h')).toBeInTheDocument();
    expect(screen.queryByText('Unset')).toBeNull();
  });

  it('renders nothing while every value is unset', () => {
    const { container } = render(
      <MetricList metrics={metrics.slice(0, 1)} locale="es" className="" />,
    );
    expect(container.querySelector('dl')).toBeNull();
  });
});
