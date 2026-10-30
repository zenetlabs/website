import { Section } from '@/components/section';
import { CARD, EYEBROW } from '@/components/ui';
import type { HomeContent } from '@/content/types';

export function Problems({ copy }: { copy: HomeContent['problems'] }) {
  return (
    <Section id="problems" eyebrow={copy.eyebrow} title={copy.title}>
      <ul className="grid gap-6 lg:grid-cols-3">
        {copy.items.map((item) => (
          <li key={item.id} className={`${CARD} flex flex-col p-8`}>
            <h3 className="font-display text-3xl leading-tight">
              {item.title}
            </h3>
            <p className="mt-4 text-muted-fg">{item.problem}</p>
            <div className="mt-6 border-t border-hairline pt-6">
              <p className={EYEBROW}>{copy.fixLabel}</p>
              <p className="mt-3">{item.fix}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
