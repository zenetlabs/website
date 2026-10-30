import { Section } from '@/components/section';
import type { FaqItem, HomeContent } from '@/content/types';

export function Faq({
  copy,
  items,
}: {
  copy: HomeContent['faq'];
  items: readonly FaqItem[];
}) {
  return (
    <Section id="faq" eyebrow={copy.eyebrow} title={copy.title}>
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
                className="font-mono text-xl leading-none text-muted-fg motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-2xl pb-6 text-muted-fg">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
