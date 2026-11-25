import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Process } from '@/components/process';
import { contactPage } from '@/content/en/contact';

describe('Process', () => {
  function items(container: HTMLElement) {
    return [...container.querySelectorAll('li')];
  }

  it('marks the first step as the stub of a rail by default', () => {
    const { container } = render(<Process copy={contactPage.next} />);
    expect(items(container).map((li) => li.hasAttribute('data-stub'))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('marks the given step', () => {
    const { container } = render(<Process copy={contactPage.next} stub={1} />);
    expect(items(container).map((li) => li.hasAttribute('data-stub'))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('sets the rail columns from the step count', () => {
    const { container } = render(<Process copy={contactPage.next} />);
    expect(
      container.querySelector('ol')?.style.getPropertyValue('--rail-cols'),
    ).toBe('3');
  });

  it('has no stub with null, and still numbers every step', () => {
    const { container } = render(
      <Process copy={contactPage.next} stub={null} />,
    );
    expect(container.querySelector('[data-stub]')).toBeNull();
    expect(container.querySelector('ol')).toHaveClass('rail');
    expect(items(container)).toHaveLength(3);
  });

  it('finds the diagnostic step on the contact page', () => {
    expect(
      contactPage.next.steps.findIndex((step) => step.id === 'diagnostic'),
    ).toBe(1);
  });
});
