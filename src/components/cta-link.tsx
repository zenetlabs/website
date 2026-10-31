import type { MouseEventHandler, ReactNode } from 'react';
import { type CtaId, track } from '@/lib/track';

export function CtaLink({
  cta,
  href,
  className,
  onClick,
  children,
}: {
  cta: CtaId;
  href: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
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
