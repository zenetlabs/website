import type { ReactNode } from 'react';
import { Container } from '@/components/section';
import { EYEBROW } from '@/components/ui';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Container className="max-w-3xl py-16 md:py-24">
      <p className={EYEBROW}>{updated}</p>
      <h1 className="mt-5">{title}</h1>
      <div className="mt-12 grid max-w-[60ch] gap-10 [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </Container>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id}>
      <h2 className="text-h2-compact">{title}</h2>
      {children}
    </section>
  );
}
