import { FlowDiagram } from '@/components/flow-diagram';
import { BulletList, MetricList } from '@/components/lists';
import { MobileFold } from '@/components/mobile-fold';
import { Section } from '@/components/section';
import { H3, TEXT_LINK } from '@/components/ui';
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
    <Section id="cases" title={copy.title} lead={copy.lead}>
      <ul className="grid gap-8 lg:grid-cols-12 lg:gap-x-14">
        {copy.items.map((item, index) => {
          const featured = index === 0;
          return (
            <li
              key={item.id}
              className={`case-item ${featured ? 'lg:col-span-7' : 'lg:col-span-5'}`}
            >
              <h3 className={featured ? 'text-h2-compact' : `${H3} lg:mt-1`}>
                {item.name}
              </h3>
              <p className="mt-1 text-ui-s text-muted-fg">{item.tag}</p>
              <p className="mt-3 text-ui-m text-fg-soft md:mt-4 md:text-base">
                {item.context}
              </p>
              {item.flow ? (
                <div className="mt-5">
                  <FlowDiagram
                    steps={item.flow.steps}
                    actors={copy.actors}
                    caption={item.flow.caption}
                  />
                </div>
              ) : null}
              <MobileFold label={copy.automatedLabel}>
                <BulletList
                  items={item.automated}
                  className={`mt-3 text-ui-m md:text-base ${featured ? 'md:grid-cols-2 md:gap-x-8' : ''}`}
                />
              </MobileFold>
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
