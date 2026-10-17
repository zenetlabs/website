import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import { PUBLIC_EMAIL } from '@/lib/site';

export function PrivacyEn({ title }: { title: string }) {
  return (
    <LegalPage title={title} updated="Last updated: 17 October 2026">
      <LegalSection title="Who is responsible for your data">
        <p>
          The controller of the personal data collected through zenetlabs.com is
          Zenet Technology Pte. Ltd. (UEN 202202371M), 160 Robinson Road #14-04,
          Singapore Business Federation Center, Singapore 068914. We operate
          under the name Zenet Labs.
        </p>
        <p>
          For any privacy question, write to{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="What we collect and why">
        <p>
          From the contact form we collect what you type into it: your name,
          email address, company (optional) and message. We use it to read and
          reply to your enquiry, and to take steps at your request before a
          possible agreement.
        </p>
        <p>
          Cloudflare also processes your IP address and request metadata to
          secure the site, including the Turnstile bot check, and in its
          operational logs.
        </p>
        <p>
          The site uses no advertising or analytics cookies and no tracking
          pixels. We measure traffic with Cloudflare Web Analytics, which does
          not use cookies and does not build profiles of visitors.
        </p>
      </LegalSection>
      <LegalSection title="Legal basis">
        <ul>
          <li>
            Your consent, which you give by ticking the box in the form (GDPR
            Art. 6(1)(a) and the Singapore Personal Data Protection Act, PDPA).
          </li>
          <li>
            Steps taken at your request before entering into an agreement (GDPR
            Art. 6(1)(b)).
          </li>
        </ul>
        <p>You can withdraw your consent at any time by writing to us.</p>
      </LegalSection>
      <LegalSection title="Who receives your data">
        <p>We do not sell your data. We use these processors:</p>
        <ul>
          <li>Resend, to deliver the contact form message by email.</li>
          <li>
            Cloudflare, to host the site, protect the form with Turnstile and
            measure traffic with cookieless Web Analytics.
          </li>
          <li>
            Google Workspace, which hosts the mailbox that receives your
            message.
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="International transfers">
        <p>
          These providers may process data outside your country, including in
          the United States and Singapore. Where required, transfers rely on
          appropriate safeguards such as the European Commission's standard
          contractual clauses.
        </p>
      </LegalSection>
      <LegalSection title="How long we keep it">
        <p>
          We keep your message for 24 months after our last contact, unless a
          professional relationship follows. In that case we keep it for as long
          as the relationship and our legal obligations require.
        </p>
      </LegalSection>
      <LegalSection title="Your rights">
        <p>
          You can ask us to access, correct, delete or restrict the use of your
          data, to object to its use, and to receive a copy of it in a portable
          format. Write to{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>{' '}
          and we will answer as soon as we can.
        </p>
        <p>
          You can also complain to a supervisory authority: the Spanish Data
          Protection Agency (AEPD) or the data protection authority of your EU
          country of residence, or the Personal Data Protection Commission
          (PDPC) of Singapore.
        </p>
      </LegalSection>
      <LegalSection title="Changes to this policy">
        <p>
          If we change this policy, we will publish the new version here and
          update the date above.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
