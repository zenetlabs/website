import type { ReactNode } from 'react';
import { LEAD } from '@/components/ui';
import type { TitleParts } from '@/content/types';

export type SectionVariant = 'default' | 'tint' | 'band' | 'compact';

const VARIANTS: Record<
  SectionVariant,
  { ground: string; bg: string; pad: string }
> = {
  default: { ground: 'paper', bg: '', pad: 'py-section' },
  compact: { ground: 'paper', bg: '', pad: 'py-section-compact' },
  tint: { ground: 'tint', bg: 'bg-tint', pad: 'py-section' },
  band: { ground: 'band', bg: 'band', pad: 'py-section-band' },
};

export function Container({
  className = '',
  width = 'content',
  children,
}: {
  className?: string;
  width?: 'content' | 'wide';
  children: ReactNode;
}) {
  const max = width === 'wide' ? 'max-w-[1360px]' : 'max-w-[1200px]';
  return (
    <div className={`mx-auto w-full ${max} px-6 ${className}`}>{children}</div>
  );
}

export function EmphasisTitle({
  parts,
  marker = false,
}: {
  parts: TitleParts;
  marker?: boolean;
}) {
  return (
    <>
      {parts.before}
      <em className={marker ? 'marker' : undefined}>{parts.emphasis}</em>
      {parts.after}
    </>
  );
}

export function Section({
  id,
  title,
  lead,
  variant = 'default',
  width = 'content',
  children,
}: {
  id: string;
  title: TitleParts;
  lead?: string;
  variant?: SectionVariant;
  width?: 'content' | 'wide';
  children: ReactNode;
}) {
  const { ground, bg, pad } = VARIANTS[variant];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-ground={ground}
      className={bg}
    >
      <Container className={pad} width={width}>
        <h2 id={`${id}-title`} className="max-w-3xl">
          <EmphasisTitle parts={title} />
        </h2>
        {lead ? <p className={`mt-5 ${LEAD}`}>{lead}</p> : null}
        <div className="mt-8 md:mt-12">{children}</div>
      </Container>
    </section>
  );
}
