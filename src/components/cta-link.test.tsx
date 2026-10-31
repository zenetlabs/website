import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CtaLink } from '@/components/cta-link';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/track', () => ({ track }));

describe('CtaLink', () => {
  it('renders a plain anchor tagged with its slot', () => {
    render(
      <CtaLink cta="hero" href="/#contact" className="x">
        Book
      </CtaLink>,
    );
    const link = screen.getByRole('link', { name: 'Book' });
    expect(link).toHaveAttribute('href', '/#contact');
    expect(link).toHaveAttribute('data-cta', 'hero');
    expect(link).toHaveClass('x');
  });

  it('runs the caller handler first, then tracks the click', async () => {
    const order: string[] = [];
    track.mockImplementation(() => order.push('track'));
    render(
      <CtaLink cta="header" href="#" onClick={() => order.push('caller')}>
        Book
      </CtaLink>,
    );
    await userEvent.setup().click(screen.getByRole('link'));
    expect(order).toEqual(['caller', 'track']);
    expect(track).toHaveBeenCalledWith('cta_click', { cta_id: 'header' });
  });
});
