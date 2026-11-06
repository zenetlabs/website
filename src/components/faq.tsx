import { Section } from '@/components/section';
import { EYEBROW, PROSE } from '@/components/ui';
import type { FaqGroup, FaqItem, SectionCopy } from '@/content/types';

function FaqEntries({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="border-t border-hairline">
      {items.map((item) => (
        <details key={item.id} id={`faq-${item.id}`} className="faq-item group">
          <summary className="fold-summary faq-summary">
            {item.question}
            <span
              aria-hidden="true"
              className="icon icon-plus text-xl text-muted-fg group-open:rotate-45"
            />
          </summary>
          <p className={`faq-answer ${PROSE}`}>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function Faq({
  copy,
  items,
}: {
  copy: SectionCopy & { groups?: readonly FaqGroup[] };
  items: readonly FaqItem[];
}) {
  const { groups } = copy;
  const sets = groups?.map((group) => ({
    group,
    items: items.filter((item) => item.group === group.id),
  }));
  const split = sets ? Math.ceil(sets.length / 2) : 0;

  return (
    <Section id="faq" title={copy.title}>
      {sets ? (
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-10">
          {[sets.slice(0, split), sets.slice(split)].map((column) => (
            <div
              key={column[0]?.group.id}
              className="grid content-start gap-8 lg:gap-10"
            >
              {column.map(({ group, items: groupItems }) => (
                <div key={group.id} data-faq-group={group.id}>
                  <h3 className={`mb-3 ${EYEBROW}`}>{group.label}</h3>
                  <FaqEntries items={groupItems} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-3xl">
          <FaqEntries items={items} />
        </div>
      )}
    </Section>
  );
}
