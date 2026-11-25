import { CompanyMark } from '@/components/companies-strip';
import { FlowBoard } from '@/components/flow-board';
import { BulletList, MetricList } from '@/components/lists';
import { Section } from '@/components/section';
import { EYEBROW, TEXT_LINK } from '@/components/ui';
import type { CasesHubContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { portfolioOf } from '@/lib/portfolio';

// The two companies we run, ruled apart: each named by its own logo, with what
// the system handles and, for Viatsy, the flow it runs on the board. Taplany
// has no flow, so its list takes the right column.
export function Cases({
  copy,
  intro,
  locale,
}: {
  copy: CasesHubContent['cases'];
  intro: string;
  locale: Locale;
}) {
  return (
    <Section id="cases" title={copy.title} intro={intro} lead={copy.lead}>
      <ul>
        {copy.items.map((item) => {
          const { logo } = portfolioOf(item.id);
          const outcome = (
            <>
              <p className={EYEBROW}>{copy.automatedLabel}</p>
              <BulletList
                items={item.automated}
                marker="tick"
                className="mt-3 text-ui-m"
              />
              <MetricList
                metrics={item.metrics}
                locale={locale}
                className="mt-6"
              />
            </>
          );
          return (
            <li key={item.id} className="case-item">
              <div>
                <h3 className="case-name">
                  <CompanyMark name={item.name} logo={logo} />
                </h3>
                <p className="case-tag">
                  {item.tag.map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </p>
                <p className="mt-3 max-w-[34em] text-ui-m text-fg-soft md:text-base">
                  {item.context}
                </p>
                {item.flow ? <div className="mt-6">{outcome}</div> : null}
                {item.link ? (
                  <a
                    href={pagePath(locale, item.link.page)}
                    className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
                  >
                    {item.link.label}
                  </a>
                ) : null}
              </div>
              <div>
                {item.flow ? (
                  <FlowBoard flow={item.flow} actors={copy.actors} />
                ) : (
                  outcome
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
