import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNear } from '@/lib/use-near';

type Entries = Array<{ isIntersecting: boolean }>;
type Observed = {
  callback: (entries: Entries) => void;
  options: { rootMargin?: string } | undefined;
  disconnect: ReturnType<typeof vi.fn>;
};
const observers: Observed[] = [];

class FakeObserver {
  constructor(
    callback: (entries: Entries) => void,
    options?: { rootMargin?: string },
  ) {
    observers.push({ callback, options, disconnect: this.disconnect });
  }
  observe = vi.fn();
  disconnect = vi.fn();
}

function Probe({ active }: { active: boolean }) {
  const { ref, near } = useNear(active);
  return <div ref={ref} data-near={String(near)} />;
}

afterEach(() => {
  observers.length = 0;
  vi.unstubAllGlobals();
});

describe('useNear', () => {
  it('is near at once and observes nothing while inactive', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { container } = render(<Probe active={false} />);
    expect(container.firstElementChild).toHaveAttribute('data-near', 'true');
    expect(observers).toHaveLength(0);
  });

  it('turns near once the element comes within 600px, then stops observing', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { container } = render(<Probe active />);
    expect(container.firstElementChild).toHaveAttribute('data-near', 'false');
    expect(observers[0]?.options?.rootMargin).toBe('600px');
    act(() => {
      observers[0]?.callback([{ isIntersecting: false }]);
    });
    expect(container.firstElementChild).toHaveAttribute('data-near', 'false');
    act(() => {
      observers[0]?.callback([{ isIntersecting: true }]);
    });
    expect(container.firstElementChild).toHaveAttribute('data-near', 'true');
    expect(observers[0]?.disconnect).toHaveBeenCalled();
  });

  it('is near at once where there is no observer', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Probe active />);
    expect(container.firstElementChild).toHaveAttribute('data-near', 'true');
  });
});
