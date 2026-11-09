import { CompanyMark } from '@/components/companies-strip';
import { FlowDiagram } from '@/components/flow-diagram';
import { BulletList, MetricList } from '@/components/lists';
import { MobileFold } from '@/components/mobile-fold';
import { Section } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { portfolioOf } from '@/lib/portfolio';

// Viatsy as the feature, with the flow it runs; Taplany as its summary. Each
// is named by its own logo.
export function Cases({
  copy,
  locale,
}: {
  copy: HomeContent['cases'];
  locale: Locale;
}) {
  return (
    <Section id="cases" title={copy.title} lead={copy.lead}>
      <ul className="grid gap-6">
        {copy.items.map((item) => {
          const { logo } = portfolioOf(item.id);
          const outcome = (
            <>
              <MobileFold label={copy.automatedLabel}>
                <BulletList
                  items={item.automated}
                  marker="tick"
                  className="mt-3 text-ui-m md:mt-0"
                />
              </MobileFold>
              <MetricList
                metrics={item.metrics}
                locale={locale}
                className="mt-6"
              />
            </>
          );
          return (
            <li
              key={item.id}
              className="case-item"
              data-featured={item.flow ? '' : undefined}
            >
              <div className={item.flow ? 'lg:col-span-7' : 'lg:col-span-5'}>
                <h3 className="case-name">
                  <CompanyMark name={item.name} logo={logo} />
                </h3>
                <p className="mt-2 text-ui-s text-muted-fg md:mt-3">
                  {item.tag}
                </p>
                <p className="mt-2 mb-4 max-w-[34em] text-ui-m text-fg-soft md:mt-3 md:mb-5 md:text-base">
                  {item.context}
                </p>
                {item.flow ? outcome : null}
                {item.link ? (
                  <a
                    href={pagePath(locale, item.link.page)}
                    className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
                  >
                    {item.link.label} →
                  </a>
                ) : null}
              </div>
              <div className={item.flow ? 'lg:col-span-5' : 'lg:col-span-7'}>
                {item.flow ? (
                  <FlowDiagram
                    steps={item.flow.steps}
                    actors={copy.actors}
                    caption={item.flow.caption}
                    className="flow-figure-flat"
                  />
                ) : (
                  outcome
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {copy.more ? (
        <p className="mt-10">
          <a
            href={pagePath(locale, 'cases')}
            className={`font-medium ${TEXT_LINK}`}
          >
            {copy.more} →
          </a>
        </p>
      ) : null}
    </Section>
  );
}
