import { LegalSection } from '@/components/legal-page';

// The parts of the privacy page that depend on the assistant and on voice, so
// the page itself reads straight through. Each renders nothing while its feature is dark.

export function AssistantSection() {
  if (!__ASSISTANT__) return null;
  return (
    <LegalSection title="The site assistant">
      <p>
        Our site has an AI assistant. It tells you it is an AI before you write
        to it. When you use it, we process your messages, its replies, the page
        you were on and the time, to answer you and to prevent abuse of the
        service.
      </p>
      <p>
        The replies are written automatically by an AI model running on
        Cloudflare Workers AI. Cloudflare does not use this content to train
        models. We keep the conversations in our database in the European Union,
        and we do not store your IP address with them.
      </p>
      <p>
        If you book a call from the assistant, the booking form in the chat asks
        for your name and email; they are used for the booking, not sent to the
        AI model.
      </p>
      <p>
        To limit abuse we also count how many questions each connection asks in
        a day. For that we keep, for up to two days, a keyed one-way fingerprint
        of your IP address: it cannot be turned back into the address and it is
        not linked to your conversation.
      </p>
      <p>
        The assistant can make mistakes. Prices and dates come only from our
        published information, and a person reads every booking and enquiry.
        Please do not share passwords, health information or other sensitive
        data in the chat.
      </p>
    </LegalSection>
  );
}

export function VoiceSection() {
  if (!__VOICE__) return null;
  return (
    <LegalSection title="Voice calls">
      <p>
        If you start a voice call with the assistant, the audio from your
        microphone is streamed to ElevenLabs (ElevenLabs Inc., United States),
        our voice provider, which transcribes it, generates the assistant's
        replies with an AI model it hosts, and speaks them. We don't record
        audio, and we have set ElevenLabs not to keep recordings. ElevenLabs
        keeps the text of the conversation for 30 days, then deletes it.
      </p>
      <p>
        We keep a technical record of the call (when it started, its language,
        your time zone and the page, with no audio and no text) for 30 days to
        prevent abuse. If you book a call during the conversation, your name,
        email, company and topic are stored with your enquiry, as for any
        booking, together with the identifiers of the call (our record's id and
        ElevenLabs' conversation id). We don't use your voice to identify you.
      </p>
    </LegalSection>
  );
}

export function AssistantBasis() {
  if (!__ASSISTANT__) return null;
  return (
    <li>
      Our legitimate interest in answering questions about our services through
      the assistant and in preventing its abuse (GDPR Art. 6(1)(f)). When you
      ask it for a call, steps taken at your request before an agreement (Art.
      6(1)(b)). Under the PDPA, using the assistant after reading its notice is
      your consent to this use.
    </li>
  );
}

export function VoiceBasis() {
  if (!__VOICE__) return null;
  return (
    <li>
      Our legitimate interest in answering questions about our services by voice
      and in preventing abuse (GDPR Art. 6(1)(f)). When you ask for a call,
      steps taken at your request before an agreement (Art. 6(1)(b)). Under the
      PDPA, starting a call after reading its notice is your consent to this
      use.
    </li>
  );
}

export function CloudflareProcessor() {
  return (
    <li>
      {__ASSISTANT__ ? (
        <>
          Cloudflare, to host the site, store enquiries and assistant
          conversations in a database in the European Union, run the assistant's
          AI model (Workers AI), protect the forms and the assistant with
          Turnstile and measure traffic with cookieless Web Analytics.
        </>
      ) : (
        <>
          Cloudflare, to host the site, store enquiries in a database in the
          European Union, protect the form with Turnstile and measure traffic
          with cookieless Web Analytics.
        </>
      )}
    </li>
  );
}

export function VoiceProcessor() {
  if (!__VOICE__) return null;
  return (
    <li>
      ElevenLabs (ElevenLabs Inc., United States), for voice calls with the
      assistant.
    </li>
  );
}

export function AssistantTransfer() {
  if (!__ASSISTANT__) return null;
  return (
    <>
      {' '}
      Cloudflare may run the assistant's model in data centres outside the
      European Union.
    </>
  );
}

export function VoiceTransfer() {
  if (!__VOICE__) return null;
  return (
    <>
      {' '}
      {/* TODO(albert): confirm ElevenLabs' DPA covers the plan and whether its EU–US Data Privacy Framework certification applies */}
      ElevenLabs processes voice calls in the United States under the European
      Commission's standard contractual clauses.
    </>
  );
}

export function AssistantRetention() {
  if (!__ASSISTANT__) return null;
  return (
    <p>
      We delete assistant conversations 30 days after they start. If you book a
      call or send us an enquiry during the same visit, the conversation is kept
      with that enquiry and deleted with it.
    </p>
  );
}

export function VoiceRetention() {
  if (!__VOICE__) return null;
  return (
    <p>
      Voice call texts: 30 days at ElevenLabs. Our voice call records: 30 days.
      The call identifiers kept with an enquiry follow the enquiry's 24 months.
    </p>
  );
}
