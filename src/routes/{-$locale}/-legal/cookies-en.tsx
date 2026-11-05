// TODO(albert): counsel sign-off of the 2026-11-05 draft
import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { taxIdLabel } from '@/lib/content';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

const CLOUDFLARE = (
  <p>
    Cloudflare, which hosts the site, may set technical security cookies, such
    as <code>__cf_bm</code> (tells automated traffic from people; it lasts 30
    minutes). They are strictly necessary to protect the site against abusive
    traffic and do not need your consent.
  </p>
);

export function CookiesEn({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalPage title={title} updated="Last updated: 5 November 2026">
      <LegalSection title="What this policy covers">
        <p>
          This policy explains how the English pages of zenetlabs.com, operated
          by {entity.legalName} ({taxIdLabel(entity)}), use cookies and similar
          technologies, such as the browser's local storage. A cookie is a small
          file a website keeps in your browser; local storage works in a similar
          way but is not sent to the server.
        </p>
      </LegalSection>
      {analytics ? (
        <>
          <LegalSection title="Strictly necessary">
            <p>
              <code>zenet-consent</code> (local storage, first party,
              zenetlabs.com) stores your choice about the cookies below, for 12
              months. It is not sent to any server.
            </p>
            {CLOUDFLARE}
          </LegalSection>
          <LegalSection title="Analytics (only if you accept)">
            <p>
              Google Analytics 4, provided by Google, measures visits and the
              actions people take, such as clicking our buttons or sending an
              enquiry (never what you write). It sets <code>_ga</code> (tells
              browsers apart) and <code>_ga_&lt;ID&gt;</code> (keeps session
              state) on zenetlabs.com, each for up to 13 months. They are
              third-party cookies: they are set on our domain but managed by
              Google. Google may process this data in the United States, under
              the EU–US Data Privacy Framework. We keep Google's advertising
              features off, so we set no advertising cookies (such as{' '}
              <code>_gcl_*</code>) and share no data with Google for
              advertising.
            </p>
          </LegalSection>
          <LegalSection title="Attribution (only if you accept)">
            <p>
              <code>zenet-first-touch</code> (local storage, first party, up to
              90 days) keeps the first page you arrived on, the site that linked
              to it and any campaign tags in the link, such as utm_source or
              gclid. If you send an enquiry, it goes with it so we know which
              channel brought you. It stays with us and Google does not receive
              it.
            </p>
          </LegalSection>
          <LegalSection title="Without cookies">
            <p>
              We measure overall traffic with Cloudflare Web Analytics, which
              works without cookies and runs whatever you choose.
            </p>
            <p>
              We use analytics cookies and the attribution record only with your
              consent (under the PDPA and, for visitors in the European Union,
              the ePrivacy rules and GDPR Art. 6(1)(a)). Rejecting them is as
              easy as accepting them, and the site works the same. We do not
              track you across sites.
            </p>
          </LegalSection>
        </>
      ) : (
        <LegalSection title="Cookies we use">
          <p>
            We do not use analytics or advertising cookies, and we do not track
            you across sites. We measure traffic with Cloudflare Web Analytics,
            which works without cookies. That is why we show no cookie banner.
          </p>
          {CLOUDFLARE}
        </LegalSection>
      )}
      <LegalSection title="Forms and Turnstile">
        <p>
          Cloudflare Turnstile tells people from bots on the contact form
          {__ASSISTANT__ ? ', in the site assistant' : null}
          {__VOICE__ ? ', when you start a voice call' : null} and, while
          booking is available, on the booking page and in the booking
          confirmation dialog that an AI agent in your browser can open
          (WebMCP). It loads only when you start using one of them, not when you
          open a page, and it is needed to provide the service you ask for.
        </p>
      </LegalSection>
      <LegalSection id="manage" title="Managing cookies">
        {analytics ? (
          <p>
            Change or withdraw your choice at any time with "Cookie settings" at
            the bottom of every page. Withdrawing stops Google Analytics at once
            and deletes its cookies where your browser allows it. You can also
            block or delete cookies in your browser settings; the site keeps
            working.
          </p>
        ) : (
          <p>
            You can block or delete cookies in your browser settings. Doing so
            will not stop the site from working.
          </p>
        )}
        <p>
          How we handle your personal data is explained in our{' '}
          <a href={pagePath('en', 'privacy')} className={TEXT_LINK}>
            privacy policy
          </a>
          . Questions? Write to{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Changes to this policy">
        <p>
          If we change the cookies we use, we will update this policy and the
          date above and, where needed, ask for your consent again.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
