import type { ReactNode } from 'react';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';

const BAND = sectionFrame('band');

export function BandSection({
  id,
  labelledBy,
  containerClassName = '',
  compact = false,
  children,
}: {
  id?: string;
  labelledBy?: string;
  containerClassName?: string;
  // Tighter padding, for a band that is the page's work rather than its close
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-ground={BAND.ground}
      className={BAND.bg}
    >
      <Container
        className={`${containerClassName} ${compact ? 'py-section-compact' : BAND.pad}`}
      >
        {children}
      </Container>
    </section>
  );
}
