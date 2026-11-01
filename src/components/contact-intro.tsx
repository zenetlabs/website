import { Container, EmphasisTitle } from '@/components/section';
import { EYEBROW, TEXT_LINK } from '@/components/ui';
import type { TitleParts } from '@/content/types';
import { PUBLIC_EMAIL } from '@/lib/site';

export type ContactCopy = {
  eyebrow?: string;
  title: TitleParts;
  lead?: string;
  mail: string;
  human?: string;
};

export const CONTACT_FRAME =
  'grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16';

export function ContactIntro({ copy, id }: { copy: ContactCopy; id?: string }) {
  return (
    <div className="lg:col-span-5">
      {copy.eyebrow ? <p className={EYEBROW}>{copy.eyebrow}</p> : null}
      <h2
        id={id}
        className={copy.eyebrow ? 'mt-5 text-balance' : 'text-balance'}
      >
        <EmphasisTitle parts={copy.title} />
      </h2>
      {copy.lead ? (
        <p className="mt-6 max-w-md text-lg text-muted-fg">{copy.lead}</p>
      ) : null}
      <p className="mt-8">
        {copy.mail}{' '}
        <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
          {PUBLIC_EMAIL}
        </a>
      </p>
      {copy.human ? <p className={`mt-4 ${EYEBROW}`}>{copy.human}</p> : null}
    </div>
  );
}

export function ContactFallback({ copy }: { copy: ContactCopy }) {
  return (
    <section className="border-t border-hairline">
      <Container className={CONTACT_FRAME}>
        <ContactIntro copy={copy} />
      </Container>
    </section>
  );
}
