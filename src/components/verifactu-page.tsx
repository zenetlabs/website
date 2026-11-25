import { DeskClose } from '@/components/desk-close';
import { Faq } from '@/components/faq';
import { Ledger } from '@/components/ledger';
import { BulletList } from '@/components/lists';
import { RelatedLinks } from '@/components/page-blocks';
import { HeroActions, PageHero } from '@/components/page-hero';
import { Includes, PriceTicket } from '@/components/price-ticket';
import { Container, Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { EYEBROW, H3, PROSE } from '@/components/ui';
import type {
  DeskCloseCopy,
  Services,
  ServicesHubContent,
  VerifactuPageContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { serviceOf } from '@/lib/page-registry';

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
  includes,
  close,
}: {
  locale: Locale;
  copy: VerifactuPageContent;
  hub: ServicesHubContent;
  services: Services;
  includes: readonly string[];
  close: DeskCloseCopy;
}) {
  const { deadlines, requirements, work } = copy;

  return (
    <>
      <PageHero
        title={copy.hero.title}
        lead={copy.hero.lead}
        actions={
          <HeroActions
            locale={locale}
            button={copy.cta.button}
            secondary={{ label: hub.labels.pricing, page: 'pricing' }}
          />
        }
        stage={
          <PriceTicket
            service={services[serviceOf('verifactu')]}
            facts={copy.facts}
            labels={hub.labels}
            locale={locale}
          />
        }
        aside={<Includes label={hub.labels.included} items={includes} />}
      />
      <StickyZone locale={locale}>
        <Section id="deadlines" title={deadlines.title} lead={copy.hero.intro}>
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
          <Ledger items={requirements.items} locale={locale} />
        </Section>
        <Section id="what-we-do" title={work.title}>
          <Ledger items={work.items} locale={locale} />
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
      <DeskClose
        cta={copy.cta}
        faq={copy.faq}
        mail={hub.labels.mail}
        {...close}
        locale={locale}
      />
    </>
  );
}
