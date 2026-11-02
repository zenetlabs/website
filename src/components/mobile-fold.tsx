import type { ReactNode } from 'react';
import { EYEBROW } from '@/components/ui';

export function MobileFold({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="mobile-fold group mt-4">
      <summary className={`fold-summary mobile-fold-summary ${EYEBROW}`}>
        {label}
        <span
          aria-hidden="true"
          className="icon icon-plus text-xl group-open:rotate-45"
        />
      </summary>
      <p className={`${EYEBROW} max-md:hidden`}>{label}</p>
      {children}
    </details>
  );
}
