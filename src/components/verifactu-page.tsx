import { Faq } from '@/components/faq';
import { BulletList } from '@/components/lists';
import {
  FactsHero,
  GetStarted,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Container, Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { EYEBROW, H3, PROSE } from '@/components/ui';
import type {
  Services,
  ServicesHubContent,
  VerifactuPageContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';

type Mark = { id: string; date: string; text: string; pending?: boolean };

// The dates in the order they fall: the programs first, then each group of
// taxpayers, then the postponement Hacienda announced, drawn as pending until
// the BOE publishes it.
function DateLine({
  deadlines,
  dates,
}: {
  deadlines: VerifactuPageContent['deadlines'];
  dates: VerifactuPageContent['dates'];
}) {
  const marks: readonly Mark[] = [
    { id: 'producers', date: dates.producersFrom, text: deadlines.producers },
    ...deadlines.rows.map((row) => ({
      id: row.id,
      date: row.date,
      text: row.who,
    })),
    {
      id: 'announced',
      date: dates.announcedTo,
      text: deadlines.announced,
      pending: true,
    },
  ];
  return (
    <ol aria-labelledby="deadlines-title" className="date-line">
      {marks.map((mark) => (
        <li
          key={mark.id}
          data-mark={mark.id}
          data-pending={mark.pending ? '' : undefined}
        >
          <p className="date-line-date">{mark.date}</p>
          <p className="date-line-text">{mark.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function VerifactuPage({
  locale,
  copy,
  hub,
  services,
}: {
  locale: Locale;
  copy: VerifactuPageContent;
  hub: ServicesHubContent;
  services: Services;
}) {
  const { deadlines, requirements, work } = copy;

  return (
    <>
      <FactsHero
        page="verifactu"
        locale={locale}
        services={services}
        labels={hub.labels}
        hero={copy.hero}
        facts={copy.facts}
        button={copy.cta.button}
      />
      <StickyZone locale={locale}>
        <Section id="deadlines" title={deadlines.title}>
          <p className={EYEBROW}>{deadlines.label}</p>
          <DateLine deadlines={deadlines} dates={copy.dates} />
          <div className="date-line-after">
            <div>
              <h3 className={H3}>{deadlines.exclusionsTitle}</h3>
              <BulletList
                items={deadlines.exclusions}
                className={`mt-4 ${PROSE}`}
              />
            </div>
            <p className="text-ui-s text-muted-fg lg:self-end">
              {deadlines.checked}
            </p>
          </div>
        </Section>
        <Section
          id="requirements"
          title={requirements.title}
          lead={requirements.lead}
          variant="tint"
        >
          <UseCaseList items={requirements.items} locale={locale} />
        </Section>
        <Section id="what-we-do" title={work.title}>
          <UseCaseList items={work.items} locale={locale} />
          <p className={`mt-8 ${PROSE}`}>{work.limits}</p>
        </Section>
        <Faq copy={copy.faq} items={copy.faq.items} />
        <Container className="pb-10">
          <p className="max-w-[60ch] text-ui-s text-muted-fg">
            {copy.disclaimer}
          </p>
        </Container>
        <RelatedLinks
          locale={locale}
          pages={copy.related}
          names={hubNames(hub)}
          labels={hub.labels}
        />
      </StickyZone>
      <GetStarted locale={locale} cta={copy.cta} mail={hub.labels.mail} />
    </>
  );
}
