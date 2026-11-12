import type { ReactNode } from 'react';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';

const BAND = sectionFrame('band');

export function BandSection({
  id,
  labelledBy,
  containerClassName = '',
  children,
}: {
  id?: string;
  labelledBy?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-ground={BAND.ground}
      className={BAND.bg}
    >
      <Container className={`${containerClassName} ${BAND.pad}`}>
        {children}
      </Container>
    </section>
  );
}
