import { BeforeAfter } from '@/components/before-after';
import { Section } from '@/components/section';
import type { HomeContent } from '@/content/types';

export function Problems({ copy }: { copy: HomeContent['problems'] }) {
  return (
    <Section id="problems" title={copy.title}>
      <BeforeAfter
        rows={copy.items.map((item) => ({
          id: item.id,
          title: item.title,
          before: item.problem,
          after: item.fix,
        }))}
        beforeLabel={copy.todayLabel}
        afterLabel={copy.fixLabel}
      />
    </Section>
  );
}
