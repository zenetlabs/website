import type { ReactNode } from 'react';
import { EYEBROW } from '@/components/ui';

export type TitleParts = { before: string; emphasis: string; after: string };

export function Container({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-6 ${className}`}>
      {children}
    </div>
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
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: TitleParts;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="border-t border-hairline"
    >
      <Container className="py-20 md:py-28">
        <p className={EYEBROW}>{eyebrow}</p>
        <h2 id={`${id}-title`} className="mt-5 max-w-3xl text-balance">
          <EmphasisTitle parts={title} />
        </h2>
        {lead ? (
          <p className="mt-6 max-w-2xl text-lg text-muted-fg">{lead}</p>
        ) : null}
        <div className="mt-14">{children}</div>
      </Container>
    </section>
  );
}
