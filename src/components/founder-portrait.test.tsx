import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FounderPortrait } from '@/components/companies-strip';
import { CONTENT } from '@/lib/content';

describe('FounderPortrait', () => {
  const { founder } = CONTENT.en;

  it('renders a lazy decorative image when a photo is set', () => {
    const { container } = render(
      <FounderPortrait
        founder={{
          ...founder,
          photo: { src: '/founder.webp', width: 288, height: 288 },
        }}
      />,
    );
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/founder.webp');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('width', '288');
    expect(image).toHaveAttribute('height', '288');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('shows the initials in the amber ring of a person without a photo', () => {
    const { container } = render(<FounderPortrait founder={founder} />);
    expect(container.querySelector('img')).toBeNull();
    const monogram = container.querySelector('[aria-hidden="true"]');
    expect(monogram?.textContent).toBe('AS');
    expect(monogram).toHaveClass('monogram');
  });
});
