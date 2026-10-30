import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Faq } from '@/components/faq';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { FAQ } from '../../test/faq';

describe.each([
  ['en', enHome, 15],
  ['es', esHome, 16],
] as const)('Faq (%s)', (locale, home, count) => {
  const faq = FAQ[locale];

  function view() {
    const { container } = render(<Faq copy={home.faq} items={faq} />);
    return {
      container,
      details: [...container.querySelectorAll('details')],
      summaries: [...container.querySelectorAll('summary')],
    };
  }

  it('renders one collapsed details per item with its anchor id', () => {
    const { details } = view();
    expect(details).toHaveLength(count);
    expect(details.map((item) => item.id)).toEqual(
      faq.map((item) => `faq-${item.id}`),
    );
    expect(details.some((item) => item.open)).toBe(false);
  });

  it('shows the question in the summary and the answer in a paragraph', () => {
    const { details } = view();
    expect(details).toHaveLength(count);
    for (const [index, item] of faq.entries()) {
      const detail = details[index];
      expect(detail?.querySelector('summary')?.firstChild?.textContent).toBe(
        item.question,
      );
      expect(detail?.querySelector('p')?.textContent).toBe(item.answer);
    }
  });

  it('keeps headings and interactive elements out of the summary', () => {
    const { summaries } = view();
    expect(summaries).toHaveLength(count);
    for (const summary of summaries) {
      expect(
        summary.querySelector('h1,h2,h3,h4,h5,h6,a,button,input,select'),
      ).toBeNull();
    }
  });

  it('hides the marker from assistive technology', () => {
    const { summaries } = view();
    expect(summaries).toHaveLength(count);
    for (const summary of summaries) {
      expect(summary.querySelector('span')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    }
  });
});
