import { useCallback, useState } from 'react';

// Whether an element has come within `margin` of the viewport (once true, it
// stays true). Inactive, it is true at once and observes nothing.
export function useNear(active: boolean, margin = '600px') {
  const [seen, setSeen] = useState(false);
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!active || !element) return;
      if (typeof IntersectionObserver === 'undefined') {
        setSeen(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          setSeen(true);
          observer.disconnect();
        },
        { rootMargin: margin },
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [active, margin],
  );
  return { ref, near: !active || seen };
}
