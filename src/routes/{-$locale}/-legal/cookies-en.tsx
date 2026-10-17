import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import { PUBLIC_EMAIL } from '@/lib/site';

export function CookiesEn({ title }: { title: string }) {
  return (
    <LegalPage title={title} updated="Last updated: 17 October 2026">
      <LegalSection title="What this policy covers">
        <p>
          This policy explains how zenetlabs.com, operated by Zenet Technology
          Pte. Ltd. (UEN 202202371M), uses cookies and similar technologies.
        </p>
      </LegalSection>
      <LegalSection title="Cookies we use">
        <p>
          We do not use analytics or advertising cookies, and we do not track
          you across sites. We measure traffic with Cloudflare Web Analytics,
          which works without cookies.
        </p>
        <p>
          Cloudflare, which hosts the site, may set strictly necessary cookies
          for security, such as protection against abusive traffic. These do not
          need your consent.
        </p>
      </LegalSection>
      <LegalSection title="Contact form and Turnstile">
        <p>
          The contact form uses Cloudflare Turnstile to tell people from bots.
          Turnstile loads only when you start filling in the form, not when you
          open a page.
        </p>
      </LegalSection>
      <LegalSection title="Managing cookies">
        <p>
          You can block or delete cookies in your browser settings. Doing so
          will not stop the site from working.
        </p>
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
