import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { taxIdLabel } from '@/lib/content';
import { PUBLIC_EMAIL } from '@/lib/site';

const CLOUDFLARE = (
  <p>
    Cloudflare, which hosts the site, may set strictly necessary cookies for
    security, such as protection against abusive traffic. These do not need your
    consent.
  </p>
);

// TODO(albert): legal review (R7 GA4, consent, first-touch)
export function CookiesEn({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalPage title={title} updated="Last updated: 17 October 2026">
      <LegalSection title="What this policy covers">
        <p>
          This policy explains how zenetlabs.com, operated by {entity.legalName}{' '}
          ({taxIdLabel(entity)}), uses cookies and similar technologies.
        </p>
      </LegalSection>
      {analytics ? (
        <>
          <LegalSection title="Strictly necessary">
            <p>
              <code>zenet-consent</code> (local storage, zenetlabs.com) stores
              your choice about the cookies below, for 12 months. It is not sent
              to any server.
            </p>
            {CLOUDFLARE}
          </LegalSection>
          <LegalSection title="Analytics (only if you accept)">
            <p>
              Google Analytics 4, provided by Google, measures visits and the
              actions people take, such as clicking our buttons or sending an
              enquiry (never what you write). It sets <code>_ga</code> (tells
              browsers apart) and <code>_ga_&lt;ID&gt;</code> (keeps session
              state) on zenetlabs.com, each for up to 13 months. Google may
              process this data in the United States.
            </p>
          </LegalSection>
          <LegalSection title="Marketing (only if you accept)">
            <p>
              <code>zenet-first-touch</code> (local storage, up to 90 days)
              keeps the first page you arrived on, the site that linked to it
              and any campaign tags in the link, such as utm_source or gclid. If
              you send an enquiry, it goes with it so we know which channel
              brought you. This choice also tells Google, through Consent Mode,
              that it may use analytics data to measure advertising; we run no
              advertising tags today.
            </p>
          </LegalSection>
          <LegalSection title="Without cookies">
            <p>
              We measure overall traffic with Cloudflare Web Analytics, which
              works without cookies and runs whatever you choose.
            </p>
            <p>
              We use analytics and marketing cookies only with your consent. We
              do not track you across sites.
            </p>
          </LegalSection>
        </>
      ) : (
        <LegalSection title="Cookies we use">
          <p>
            We do not use analytics or advertising cookies, and we do not track
            you across sites. We measure traffic with Cloudflare Web Analytics,
            which works without cookies.
          </p>
          {CLOUDFLARE}
        </LegalSection>
      )}
      <LegalSection title="Contact form and Turnstile">
        <p>
          The contact form uses Cloudflare Turnstile to tell people from bots.
          Turnstile loads only when you start filling in the form, not when you
          open a page.
        </p>
      </LegalSection>
      <LegalSection id="manage" title="Managing cookies">
        {analytics ? (
          <p>
            Change or withdraw your choice at any time with "Cookie settings" at
            the bottom of every page. Withdrawing stops Google Analytics from
            the next page and deletes its cookies where your browser allows it.
            You can also block or delete cookies in your browser settings; the
            site keeps working.
          </p>
        ) : (
          <p>
            You can block or delete cookies in your browser settings. Doing so
            will not stop the site from working.
          </p>
        )}
        <p>
          Questions? Write to{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
