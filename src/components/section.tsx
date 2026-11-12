import type { ReactNode } from 'react';
import { type SectionVariant, sectionFrame } from '@/components/section-frame';
import { LEAD } from '@/components/ui';
import type { TitleParts } from '@/content/types';

// One wrap for every section (1312px of content between the gutters), or the
// narrow column for /book.
const WIDTHS = {
  wrap: 'max-w-[calc(82rem+2*var(--spacing-gutter))]',
  narrow: 'max-w-3xl',
} as const;

export function Container({
  className = '',
  width = 'wrap',
  children,
}: {
  className?: string;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${WIDTHS[width]} px-gutter ${className}`}>
      {children}
    </div>
  );
}

export function EmphasisTitle({ parts }: { parts: TitleParts }) {
  return (
    <>
      {parts.before}
      <em>{parts.emphasis}</em>
      {parts.after}
    </>
  );
}

export function Section({
  id,
  title,
  lead,
  variant = 'default',
  children,
}: {
  id: string;
  title: TitleParts;
  lead?: string;
  variant?: SectionVariant;
  children: ReactNode;
}) {
  const { ground, bg, pad } = sectionFrame(variant);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-ground={ground}
      className={bg}
    >
      <Container className={pad}>
        <h2 id={`${id}-title`} className="max-w-[12em]">
          <EmphasisTitle parts={title} />
        </h2>
        {lead ? <p className={`mt-5 md:mt-6 ${LEAD}`}>{lead}</p> : null}
        <div className="mt-5 md:mt-14">{children}</div>
      </Container>
    </section>
  );
}
