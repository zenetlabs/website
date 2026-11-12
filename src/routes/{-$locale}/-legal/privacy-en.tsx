// TODO(albert): counsel sign-off of the 2026-11-05 draft
import {
  LegalPage,
  LegalSection,
  type LegalSectionRef,
} from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { formatAddress, legalEntity, taxIdLabel } from '@/lib/content';
import { pagePath } from '@/lib/page-registry';
import { PRIVACY_EMAIL, PUBLIC_EMAIL } from '@/lib/site';
import {
  AssistantBasis,
  AssistantRetention,
  AssistantSection,
  AssistantTransfer,
  CalculatorUse,
  CloudflareProcessor,
  VoiceBasis,
  VoiceProcessor,
  VoiceRetention,
  VoiceSection,
  VoiceTransfer,
  WebMcpUse,
} from '@/routes/{-$locale}/-legal/privacy-extras-en';
import {
  ASSISTANT_SECTION,
  VOICE_SECTION,
} from '@/routes/{-$locale}/-legal/privacy-extras-sections';

const SECTIONS = {
  responsible: { id: 'responsible', title: 'Who is responsible for your data' },
  collect: { id: 'what-we-collect', title: 'What we collect and why' },
  store: { id: 'where-we-store-it', title: 'Where we store it' },
  basis: { id: 'legal-basis', title: 'Legal basis' },
  recipients: { id: 'recipients', title: 'Who receives your data' },
  transfers: {
    id: 'international-transfers',
    title: 'International transfers',
  },
  retention: { id: 'retention', title: 'How long we keep it' },
  rights: { id: 'your-rights', title: 'Your rights' },
  security: { id: 'security', title: 'Security' },
  children: { id: 'children', title: 'Children' },
  cookies: { id: 'cookies', title: 'Cookies' },
  changes: { id: 'changes', title: 'Changes to this policy' },
} as const satisfies Record<string, LegalSectionRef>;

const EMAIL = (
  <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
    {PUBLIC_EMAIL}
  </a>
);

const DPO_EMAIL = (
  <a href={`mailto:${PRIVACY_EMAIL}`} className={TEXT_LINK}>
    {PRIVACY_EMAIL}
  </a>
);

export function PrivacyEn({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const spanish = legalEntity('es');
  const contents = [
    SECTIONS.responsible,
    SECTIONS.collect,
    SECTIONS.store,
    ...(__ASSISTANT__ ? [ASSISTANT_SECTION.en] : []),
    ...(__VOICE__ ? [VOICE_SECTION.en] : []),
    SECTIONS.basis,
    SECTIONS.recipients,
    SECTIONS.transfers,
    SECTIONS.retention,
    SECTIONS.rights,
    SECTIONS.security,
    SECTIONS.children,
    SECTIONS.cookies,
    SECTIONS.changes,
  ];

  return (
    <LegalPage
      locale="en"
      contents={contents}
      title={title}
      updated="Last updated: 10 November 2026"
    >
      <LegalSection section={SECTIONS.responsible}>
        <p>
          The controller of the personal data collected through the English
          pages of zenetlabs.com is {entity.legalName} ({taxIdLabel(entity)}),{' '}
          {formatAddress(entity.address, 'en')}. We operate under the name Zenet
          Labs.
        </p>
        {spanish.legalName !== entity.legalName ? (
          <p>
            The Spanish pages (those starting with zenetlabs.com/es) are run by{' '}
            {spanish.legalName}, a sole trader in Spain, under their own{' '}
            <a href={pagePath('es', 'privacy')} className={TEXT_LINK}>
              privacy policy in Spanish
            </a>
            .
          </p>
        ) : null}
        <p>
          This policy is our notice under Singapore's Personal Data Protection
          Act 2012 (PDPA) and, for visitors in the European Union, under the
          GDPR. Our Data Protection Officer is Dan Lu: send privacy questions
          and data requests to {DPO_EMAIL}. For anything else, write to {EMAIL}.
        </p>
      </LegalSection>
      <Collection />
      <LegalSection section={SECTIONS.store}>
        <p>
          We store each enquiry, and a record of the emails we send about it, in
          a database run by Cloudflare in the European Union. Only the owner of
          the site can open it, through their Cloudflare account or an internal
          page protected by Cloudflare Access. The emails about your enquiry are
          also kept in our Google Workspace mailbox.
        </p>
      </LegalSection>
      <AssistantSection />
      <VoiceSection />
      <Bases />
      <Recipients />
      <Retention />
      <Rights />
    </LegalPage>
  );
}

function Collection() {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalSection section={SECTIONS.collect}>
      <p>
        From the contact form we collect what you type into it: your name, email
        address, company (optional) and message. We use it to read and reply to
        your enquiry, and to take steps at your request before a possible
        agreement. We also send you an acknowledgement email at the address you
        gave. The fields the form marks as required are needed to reply to you:
        without them we cannot handle your enquiry.
      </p>
      <p>
        With the form we also record the page where you arrived on our site, the
        page you sent it from, the website that linked to it (the referrer) and
        any campaign tags in the link you followed, such as utm_source or gclid.
        We use this to understand which channels bring enquiries.{' '}
        {analytics ? (
          <>
            Unless you accept attribution, we store nothing on your device for
            this. If you accept it, your browser keeps the first page you
            arrived on, the referring site and the campaign tags for up to 90
            days, and they are sent with your enquiry.
          </>
        ) : (
          <>We do not store anything on your device to do this.</>
        )}
      </p>
      <p>
        If you book a call, before anything is booked we email you a link. The
        time is kept for you for 30 minutes. The booking, and the calendar
        event, are made only when you open the link and confirm. If you don't
        confirm, the request lapses: your name, company and topic are deleted
        when it expires, and the rest after 30 days.
      </p>
      <p>
        So that the form can't be used to email other people, we count
        confirmation emails per address and per connection. For the connection
        we keep only a keyed one-way fingerprint of your IP address, deleted at
        03:00 UTC two days later. We don't accept addresses from temporary email
        services.
      </p>
      <p>
        Once you confirm, we keep the booking with your enquiry (the time you
        chose, your time zone, your name, email, company and topic), we create
        an event in our Google Workspace calendar with your email address, and
        Google sends you a calendar invitation with a Google Meet link. Your
        name and the topic you write stay with us; they are not put in the
        invitation. If we cancel a call, we email you, and Google sends its own
        cancellation.
      </p>
      <p>
        When you send the form you tick a box confirming that you have read this
        policy, which under the PDPA is also your consent to this use. We store
        which version of the policy it was and when you ticked it, so that we
        can show it.
      </p>
      <p>
        When you visit the site, Cloudflare, which hosts it, processes your IP
        address and the technical details of each request (such as the browser,
        the page asked for and the time) to serve the pages and to protect the
        site from attacks and abuse. This includes the Turnstile bot check, the
        per-connection limits on form submissions and our server's technical
        logs, which do not contain what you write in your messages.
      </p>
      {analytics ? (
        <p>
          If you accept analytics cookies, we use Google Analytics 4 to measure
          visits and actions on the site, such as clicks on our buttons and sent
          enquiries, never what you write in them. Without your consent Google
          Analytics does not load. We always measure overall traffic with
          Cloudflare Web Analytics, which does not use cookies and does not
          build profiles of visitors.
        </p>
      ) : (
        <p>
          The site uses no advertising or analytics cookies and no tracking
          pixels. We measure traffic with Cloudflare Web Analytics, which does
          not use cookies and does not build profiles of visitors.
        </p>
      )}
      <CalculatorUse />
      <WebMcpUse />
      <p>
        We only write to you to answer your enquiry or about the call you
        booked. We will not send you marketing emails unless you have agreed to
        receive them.
      </p>
    </LegalSection>
  );
}

function Bases() {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalSection section={SECTIONS.basis}>
      <p>Each purpose has a single legal basis under the GDPR:</p>
      <ul>
        <li>
          Answering your enquiry, sending the acknowledgement and handling the
          call you book: steps taken at your request before entering into an
          agreement (GDPR Art. 6(1)(b)). Under the PDPA, this use rests on the
          consent you give by ticking the box in the form.
        </li>
        <li>
          Knowing which channels bring enquiries, with the referrer and campaign
          data: our legitimate interest (GDPR Art. 6(1)(f)). It is limited to
          what the link and your browser already send.
        </li>
        <li>
          Keeping the site secure and preventing abuse, with the IP address,
          Turnstile, the submission limits and the technical logs, and knowing
          our traffic in aggregate through Cloudflare Web Analytics: our
          legitimate interest (GDPR Art. 6(1)(f); under the PDPA, the legitimate
          interests exception).
        </li>
        <li>
          Keeping the record of the policy version you were shown and the date:
          our duty to be able to show that we informed you (GDPR Art. 5(2) and
          6(1)(c)).
        </li>
        <AssistantBasis />
        <VoiceBasis />
        {analytics ? (
          <li>
            Analytics cookies and the attribution record: your consent (GDPR
            Art. 6(1)(a), the ePrivacy rules and the PDPA), which you can
            withdraw at any time with "Cookie settings" at the bottom of every
            page, without affecting what was done before.
          </li>
        ) : null}
      </ul>
      <p>
        Under the PDPA you can withdraw your consent at any time by writing to
        our Data Protection Officer. Before acting on it, we will tell you what
        withdrawing means for you, and then stop using your data for that
        purpose unless the law lets us keep it. Where we rely on our legitimate
        interest, you can object to it.
      </p>
    </LegalSection>
  );
}

function Recipients() {
  const analytics = __GA4_ID__ !== null;
  return (
    <>
      <LegalSection section={SECTIONS.recipients}>
        <p>
          We do not sell your data or share it with third parties, except where
          the law requires it (for example, to authorities or courts that ask
          for it). We contract these processors directly, under contracts that
          bind them to protect it:
        </p>
        <ul>
          <CloudflareProcessor />
          <li>
            Resend (Resend, Inc., United States), to deliver the contact form
            message to us and your acknowledgement email.
          </li>
          <li>
            Google (Google Asia Pacific Pte. Ltd., Singapore), for Google
            Workspace: the mailbox that receives your message and, when you book
            a call, Google Workspace Calendar and Meet.
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
      <LegalSection section={SECTIONS.transfers}>
        <p>
          These providers may process data outside your country, including in
          the United States and Singapore. When we transfer personal data
          outside Singapore, we make sure it keeps a standard of protection
          comparable to the PDPA's (section 26), through our providers'
          contractual commitments. For data from the European Union:
        </p>
        <ul>
          <li>
            Cloudflare, Inc. and Google LLC (which Google uses as a
            subprocessor) are certified under the EU–US Data Privacy Framework,
            covered by the European Commission's adequacy decision of 10 July
            2023, and their contracts also include the European Commission's
            standard contractual clauses.
          </li>
          <li>
            Resend, Inc. applies the European Commission's standard contractual
            clauses in its data processing agreement.
          </li>
          <AssistantTransfer />
          <VoiceTransfer />
        </ul>
        <p>You can ask us for a copy of these safeguards.</p>
      </LegalSection>
    </>
  );
}

function Retention() {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalSection section={SECTIONS.retention}>
      <ul>
        <li>
          Enquiries and bookings, with their source data, the record of the
          policy you read and the record of the emails we sent: we delete them
          from the site database automatically 24 months after we receive them.
        </li>
        <li>
          Booking requests that are never confirmed: the name, company and topic
          are deleted when the request expires, 30 minutes after it is made, and
          the rest after 30 days.
        </li>
        <li>
          Call events in our Google Workspace calendar: deleted automatically 24
          months after the booking.
        </li>
        <li>
          The fingerprints of the connections that asked for a booking: deleted
          at 03:00 UTC two days later.
        </li>
        <li>
          Emails in our mailbox: once a month we delete by hand the threads
          whose last message is older than 24 months, unless a professional
          relationship has started; in that case we keep them for as long as the
          relationship lasts and then for as long as Singapore law requires
          (five years for accounting and tax records).
        </li>
        <li>
          Copies of the emails we send, kept by Resend (content, sending details
          and delivery events): 30 days.
        </li>
        <li>Server technical logs: 7 days at most.</li>
        <AssistantRetention />
        <VoiceRetention />
        {analytics ? (
          <>
            <li>
              Your cookie choice: 12 months, in your browser. The first page you
              arrived on, if you accept attribution: 90 days, in your browser.
            </li>
            <li>Google Analytics keeps event data for 14 months.</li>
          </>
        ) : null}
      </ul>
      <p>
        After these periods we delete the data. The database's automatic backups
        (Cloudflare D1 Time Travel) keep deleted data for up to 30 more days
        before it is erased for good.
      </p>
    </LegalSection>
  );
}

function Rights() {
  return (
    <>
      <LegalSection section={SECTIONS.rights}>
        <p>
          Under the PDPA you can ask us for access to your personal data and how
          we have used it, ask us to correct it, and withdraw your consent. We
          answer access and correction requests as soon as we reasonably can,
          and within 30 days or, if we need longer, we tell you when.
        </p>
        <p>
          {/* TODO(albert): counsel to confirm whether GDPR Art. 3(2) reaches the English pages and, if it does, whether the Art. 27(2) exemption applies or an EU representative is needed */}
          If you are in the European Union, the GDPR also lets you ask us to
          access, correct, delete or restrict the use of your data, to object to
          its use, and to receive a copy of it in a portable format, free of
          charge. We answer within one month, which we may extend by two more
          for complex requests. We take no decisions based solely on automated
          processing that have legal or similarly significant effects on you.
        </p>
        <p>
          Write to our Data Protection Officer at {DPO_EMAIL}, if possible from
          the email address you used with us. If we reasonably doubt who you
          are, we may ask for what we need to confirm it.
        </p>
        <p>
          You can also complain to a supervisory authority: the Personal Data
          Protection Commission (PDPC) of Singapore or, in the European Union,
          the data protection authority of the country where you live or work.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.security}>
        <p>
          We protect your data with reasonable security arrangements: the site
          only works over encrypted connections (HTTPS), only the owner can open
          the database, the forms are protected against bots and abuse, and we
          keep only the data we need, for the periods above.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.children}>
        <p>
          Our services are for businesses and professionals. We do not knowingly
          collect personal data from children; if you are under 18, please do
          not send us personal data through this site.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.cookies}>
        <p>
          The cookies and similar technologies we use are described in our{' '}
          <a href={pagePath('en', 'cookies')} className={TEXT_LINK}>
            cookies policy
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.changes}>
        <p>
          If we change this policy, we will publish the new version here and
          update the date above.
        </p>
      </LegalSection>
    </>
  );
}
