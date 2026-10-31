import { BulletList, MetricList } from '@/components/lists';
import { Section } from '@/components/section';
import { CARD, EYEBROW, TEXT_LINK } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

export function Cases({
  copy,
  locale,
}: {
  copy: HomeContent['cases'];
  locale: Locale;
}) {
  return (
    <Section
      id="cases"
      eyebrow={copy.eyebrow}
      title={copy.title}
      lead={copy.lead}
    >
      <ul className="grid gap-6 lg:grid-cols-2">
        {copy.items.map((item) => (
          <li key={item.id} className={`${CARD} flex flex-col p-8`}>
            <p className={EYEBROW}>{item.tag}</p>
            <h3 className="mt-4 font-display text-3xl leading-tight">
              {item.name}
            </h3>
            <p className="mt-4 text-muted-fg">{item.context}</p>
            <div className="mt-6 border-t border-hairline pt-6">
              <p className={EYEBROW}>{copy.automatedLabel}</p>
              <BulletList items={item.automated} className="mt-4" />
            </div>
            <MetricList
              metrics={item.metrics}
              locale={locale}
              className="mt-6"
            />
            {item.link ? (
              <a
                href={pagePath(locale, item.link.page)}
                className={`mt-6 self-start font-medium ${TEXT_LINK}`}
              >
                {item.link.label} →
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
