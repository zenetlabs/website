import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { formatAddress, taxIdLabel } from '@/lib/content';
import { PUBLIC_EMAIL } from '@/lib/site';
import {
  AssistantBasis,
  AssistantRetention,
  AssistantSection,
  AssistantTransfer,
  CloudflareProcessor,
  VoiceBasis,
  VoiceProcessor,
  VoiceRetention,
  VoiceSection,
  VoiceTransfer,
} from '@/routes/{-$locale}/-legal/privacy-extras-en';

// TODO(albert): legal review (R6 storage, attribution, retention; R7 GA4, consent, first-touch; R9 Google Calendar bookings; R10 assistant, Workers AI, transcripts, retention; R12 voice, ElevenLabs, US transfer, retention)
export function PrivacyEn({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const analytics = __GA4_ID__ !== null;

  return (
    <LegalPage title={title} updated="Last updated: 1 November 2026">
      <LegalSection title="Who is responsible for your data">
        <p>
          The controller of the personal data collected through zenetlabs.com is{' '}
          {entity.legalName} ({taxIdLabel(entity)}),{' '}
          {formatAddress(entity.address, 'en')}. We operate under the name Zenet
          Labs.
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
          possible agreement. We also send you an acknowledgement email at the
          address you gave.
        </p>
        <p>
          With the form we also record the page where you arrived on our site,
          the page you sent it from, the website that linked to it (the
          referrer) and any campaign tags in the link you followed, such as
          utm_source or gclid. We use this to understand which channels bring
          enquiries.{' '}
          {analytics ? (
            <>
              Unless you accept marketing cookies, we store nothing on your
              device for this. If you accept them, your browser keeps the first
              page you arrived on, the referring site and the campaign tags for
              up to 90 days, and they are sent with your enquiry.
            </>
          ) : (
            <>We do not store anything on your device to do this.</>
          )}
        </p>
        <p>
          If you book a call, we create an event in our Google Workspace
          calendar with your email address, Google sends you a calendar
          invitation with a Google Meet link, and we keep the booking with your
          enquiry. Your name and the topic you write stay with us; they are not
          put in the invitation.
        </p>
        <p>
          We also store which version of this policy you consented to, and when
          you did.
        </p>
        <p>
          Cloudflare also processes your IP address and request metadata to
          secure the site, including the Turnstile bot check, and in its
          operational logs.
        </p>
        {analytics ? (
          <p>
            If you accept analytics cookies, we use Google Analytics 4 to
            measure visits and actions on the site, such as clicks on our
            buttons and sent enquiries, never what you write in them. Without
            your consent Google Analytics does not load. We always measure
            overall traffic with Cloudflare Web Analytics, which does not use
            cookies and does not build profiles of visitors.
          </p>
        ) : (
          <p>
            The site uses no advertising or analytics cookies and no tracking
            pixels. We measure traffic with Cloudflare Web Analytics, which does
            not use cookies and does not build profiles of visitors.
          </p>
        )}
      </LegalSection>
      <LegalSection title="Where we store it">
        <p>
          We store each enquiry, and a record of the emails we send about it, in
          a database run by Cloudflare in the European Union. Only Zenet Labs
          can open it, through a login protected by Cloudflare Access.
        </p>
      </LegalSection>
      <AssistantSection />
      <VoiceSection />
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
          <li>
            Our legitimate interest in knowing which channels bring enquiries,
            for the referrer and campaign data (GDPR Art. 6(1)(f)). It is
            limited to what the link and your browser already send.
          </li>
          <AssistantBasis />
          <VoiceBasis />
          {analytics ? (
            <li>
              Your consent for analytics and marketing cookies (GDPR Art.
              6(1)(a), the ePrivacy rules and the PDPA), which you can withdraw
              at any time with "Cookie settings" at the bottom of every page.
            </li>
          ) : null}
        </ul>
        <p>You can withdraw your consent at any time by writing to us.</p>
      </LegalSection>
      <LegalSection title="Who receives your data">
        <p>We do not sell your data. We use these processors:</p>
        <ul>
          <li>
            Resend, to deliver the contact form message to us and your
            acknowledgement email.
          </li>
          <CloudflareProcessor />
          <li>
            Google Workspace, which hosts the mailbox that receives your
            message.
          </li>
          <li>
            Google (Google Ireland Limited and Google LLC), for Google Workspace
            Calendar and Meet when you book a call.
          </li>
          <VoiceProcessor />
          {analytics ? (
            <li>
              Google (Google Ireland Limited and Google LLC), for Google
              Analytics, only if you accept analytics cookies.
            </li>
          ) : null}
        </ul>
      </LegalSection>
      <LegalSection title="International transfers">
        <p>
          These providers may process data outside your country, including in
          the United States and Singapore. Where required, transfers rely on
          appropriate safeguards such as the European Commission's standard
          contractual clauses.
          <AssistantTransfer />
          <VoiceTransfer />
          {analytics ? (
            <> Google relies on the EU–US Data Privacy Framework.</>
          ) : null}
        </p>
      </LegalSection>
      <LegalSection title="How long we keep it">
        <p>
          We delete enquiries from the site database automatically 24 months
          after we receive them. Copies in our mailbox are kept for 24 months
          after our last contact, unless a professional relationship follows; in
          that case we keep them for as long as the relationship and our legal
          obligations require.
        </p>
        <p>Unconfirmed booking attempts are deleted after 30 days.</p>
        <AssistantRetention />
        <VoiceRetention />
        {analytics ? (
          <p>
            {/* TODO(albert): match the GA4 retention setting */}
            Google Analytics keeps event data for 14 months.
          </p>
        ) : null}
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
