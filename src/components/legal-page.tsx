import type { ReactNode } from 'react';
import { Container } from '@/components/section';

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
    <Container width="narrow" className="py-16 md:py-24">
      <h1>{title}</h1>
      <p className="mt-5 text-ui-s text-muted-fg">{updated}</p>
      <div className="mt-12 grid max-w-[60ch] gap-12 border-t border-hairline pt-12 [&_h2]:text-fg [&_li]:text-fg-soft [&_p]:text-fg-soft [&_li]:mt-2 [&_li]:pl-1 [&_li]:marker:text-muted-fg [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
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
