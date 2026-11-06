import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StickyZone } from '@/components/sticky-cta';
import { CTA_TARGET, navHref } from '@/lib/nav';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
}));

describe('StickyZone', () => {
  it('ends with the bar: nav label, the booking target and the sticky cta id', () => {
    const { container } = render(
      <StickyZone locale="en">
        <section>zone</section>
      </StickyZone>,
    );
    const bar = container.querySelector('[data-sticky-cta]');
    expect(bar).not.toBeNull();
    expect(container.firstElementChild?.lastElementChild).toBe(bar);
    const link = screen.getByRole('link', { name: 'Book a call' });
    expect(link).toHaveAttribute('href', navHref('en', CTA_TARGET));
    expect(link).toHaveAttribute('data-cta', 'sticky');
  });
});
