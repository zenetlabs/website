import type { MouseEventHandler, ReactNode } from 'react';
import { type CtaId, track } from '@/lib/track';

export function CtaLink({
  cta,
  href,
  className,
  label,
  onClick,
  current,
  popup,
  children,
}: {
  cta: CtaId;
  href: string;
  className?: string;
  label?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  current?: boolean;
  popup?: 'dialog';
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-current={current ? 'page' : undefined}
      className={className}
      aria-label={label}
      aria-haspopup={popup}
      data-cta={cta}
      onClick={(event) => {
        onClick?.(event);
        track('cta_click', { cta_id: cta });
      }}
    >
      {children}
    </a>
  );
}
