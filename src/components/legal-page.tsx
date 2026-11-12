import type { ReactNode } from 'react';
import { Container } from '@/components/section';
import { PROSE } from '@/components/ui';
import type { Locale } from '@/lib/i18n';

const CONTENTS_LABEL = { en: 'On this page', es: 'En esta página' } as const;

export type LegalSectionRef = { readonly id: string; readonly title: string };

const CONTENTS_LINK =
  'flex min-h-11 items-center text-ui-s text-fg-soft underline decoration-transparent underline-offset-4 motion-safe:transition-[color,text-decoration-color] motion-safe:duration-(--duration-hover) motion-safe:ease-out lg:min-h-0 lg:py-1.5 pointer-fine:hover:text-fg pointer-fine:hover:decoration-current';

function ContentsList({ sections }: { sections: readonly LegalSectionRef[] }) {
  return (
    <ul className="grid">
      {sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className={CONTENTS_LINK}>
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LegalPage({
  title,
  updated,
  locale,
  contents,
  children,
}: {
  title: string;
  updated: string;
  locale: Locale;
  contents: readonly LegalSectionRef[];
  children: ReactNode;
}) {
  const contentsLabel = CONTENTS_LABEL[locale];
  return (
    <Container className="py-16 md:py-24">
      <h1 className="max-w-3xl">{title}</h1>
      <p className="mt-5 text-ui-s text-muted-fg">{updated}</p>
      <div className="mt-10 border-t border-hairline pt-8 lg:mt-12 lg:grid lg:grid-cols-12 lg:gap-x-10 lg:pt-12">
        <nav
          aria-label={contentsLabel}
          className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-3 lg:max-h-[calc(100dvh-var(--header-h)-3rem)] lg:self-start lg:overflow-y-auto"
        >
          <details className="legal-contents mb-8 rounded-inner border border-hairline lg:hidden">
            <summary className="fold-summary px-4 text-ui-s font-semibold">
              {contentsLabel}
            </summary>
            <div className="border-t border-hairline px-4 py-2">
              <ContentsList sections={contents} />
            </div>
          </details>
          <div className="hidden lg:block">
            <p className="mb-2 text-ui-s font-semibold text-muted-fg">
              {contentsLabel}
            </p>
            <ContentsList sections={contents} />
          </div>
        </nav>
        <div
          className={`grid gap-10 text-base md:leading-[1.6] lg:col-span-8 lg:col-start-4 lg:text-lg ${PROSE} [&_h2]:text-fg [&_li]:mt-2 [&_li]:pl-1 [&_li]:marker:text-muted-fg/60 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6`}
        >
          {children}
        </div>
      </div>
    </Container>
  );
}

export function LegalSection({
  section,
  children,
}: {
  section: LegalSectionRef;
  children: ReactNode;
}) {
  return (
    <section id={section.id}>
      <h2 className="text-h3">{section.title}</h2>
      {children}
    </section>
  );
}
