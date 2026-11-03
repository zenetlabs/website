import { BandSection } from '@/components/band-section';
import { CtaLink } from '@/components/cta-link';
import { EmphasisTitle } from '@/components/section';
import { LEAD, TEXT_LINK } from '@/components/ui';
import { VoiceCallout } from '@/components/voice-button';
import type { TitleParts } from '@/content/types';
import { useLocale } from '@/lib/i18n';
import { ctaTarget, navHref } from '@/lib/nav';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';

export type ContactCopy = {
  title: TitleParts;
  lead?: string;
  mail: string;
  human?: string;
  book?: string;
  voice?: { text: string; button: string };
};

export const CONTACT_FRAME = 'grid gap-12 lg:grid-cols-12 lg:gap-16';

export function ContactIntro({ copy, id }: { copy: ContactCopy; id?: string }) {
  const locale = useLocale();
  const cta = ctaTarget(SITE);
  return (
    <div className="lg:col-span-5">
      <h2 id={id}>
        <EmphasisTitle parts={copy.title} />
      </h2>
      {copy.lead ? <p className={`mt-5 ${LEAD}`}>{copy.lead}</p> : null}
      <p className="mt-8">
        {copy.mail}{' '}
        <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
          {PUBLIC_EMAIL}
        </a>
      </p>
      {copy.book && cta.page === 'book' ? (
        <p className="mt-4">
          <CtaLink
            cta="contact_book"
            href={navHref(locale, cta)}
            className={TEXT_LINK}
          >
            {copy.book}
          </CtaLink>
        </p>
      ) : null}
      {copy.human ? (
        <p className="mt-4 text-ui-s text-muted-fg">{copy.human}</p>
      ) : null}
      {copy.voice ? (
        <VoiceCallout text={copy.voice.text} button={copy.voice.button} />
      ) : null}
    </div>
  );
}

export function ContactFallback({ copy }: { copy: ContactCopy }) {
  return (
    <BandSection containerClassName={CONTACT_FRAME}>
      <ContactIntro copy={copy} />
    </BandSection>
  );
}
