import { Section } from '@/components/section';
import { PROSE } from '@/components/ui';
import type { FaqItem, HomeContent } from '@/content/types';

export function Faq({
  copy,
  items,
}: {
  copy: HomeContent['faq'];
  items: readonly FaqItem[];
}) {
  return (
    <Section id="faq" title={copy.title}>
      <div className="max-w-3xl border-t border-hairline">
        {items.map((item) => (
          <details
            key={item.id}
            id={`faq-${item.id}`}
            className="group border-b border-hairline"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 rounded-input py-5 text-lg font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="icon icon-plus text-xl text-muted-fg group-open:hidden"
              />
              <span
                aria-hidden="true"
                className="icon icon-minus hidden text-xl text-muted-fg group-open:inline-block"
              />
            </summary>
            <p className={`pb-6 ${PROSE}`}>{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
