import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CtaSection } from '@/components/cta-section';
import { CTA_TARGET, navHref } from '@/lib/nav';

const COPY = { title: 'Start', text: 'Tell us.', button: 'Book' };

describe('CtaSection', () => {
  it('is a band with the primary button and an optional link', () => {
    const { container } = render(
      <CtaSection
        cta="pricing"
        copy={COPY}
        locale="en"
        secondary={{ label: 'Read the FAQ', href: '/#faq' }}
      />,
    );
    expect(container.querySelector('section')).toHaveClass('band');
    expect(
      screen.getByRole('heading', { level: 2, name: COPY.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.button })).toHaveAttribute(
      'href',
      navHref('en', CTA_TARGET),
    );
    expect(
      screen.getByRole('link', { name: 'Read the FAQ →' }),
    ).toHaveAttribute('href', '/#faq');
  });
});
