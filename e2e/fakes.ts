import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

export const FAKES = 'http://127.0.0.1:4175';
export const NOTIFY_TO = 'owner-alerts@example.com';

const emailSchema = z.object({
  idempotencyKey: z.string(),
  to: z.string().nullable(),
  replyTo: z.string().nullable(),
  from: z.string().nullable(),
  subject: z.string().nullable(),
  text: z.string().nullable(),
  status: z.number(),
  id: z.string().nullable(),
});

export type FakeEmail = z.infer<typeof emailSchema>;

export function uniqueEmail(label: string): string {
  return `${label}-${crypto.randomUUID().slice(0, 8)}@example.com`;
}

export async function attemptsFor(email: string): Promise<FakeEmail[]> {
  const response = await fetch(`${FAKES}/__attempts`);
  const all = z.array(emailSchema).parse(await response.json());
  return all.filter((entry) => entry.to === email || entry.replyTo === email);
}

export async function sentFor(email: string): Promise<FakeEmail[]> {
  return (await attemptsFor(email)).filter((entry) => entry.status === 200);
}

export async function failFor(email: string, count: number): Promise<void> {
  await fetch(`${FAKES}/__fail`, {
    method: 'POST',
    body: JSON.stringify({ count, match: email }),
  });
}

export async function accessToken(
  claims: { aud?: string; iss?: string; exp?: number | string } = {},
): Promise<string> {
  const response = await fetch(`${FAKES}/__access/token`, {
    method: 'POST',
    body: JSON.stringify(claims),
  });
  return z.object({ token: z.string() }).parse(await response.json()).token;
}

const googleEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  calendarId: z.string(),
  attendees: z.array(z.object({ email: z.string() })),
  hangoutLink: z.string().optional(),
  start: z.object({ dateTime: z.string() }),
});

export type GoogleEvent = z.infer<typeof googleEventSchema>;

export async function googleReset(): Promise<void> {
  await fetch(`${FAKES}/__google/__state`, { method: 'DELETE' });
}

export async function googleEvents(): Promise<GoogleEvent[]> {
  const response = await fetch(`${FAKES}/__google/__events`);
  return z.array(googleEventSchema).parse(await response.json());
}

const deletionSchema = z.object({
  calendarId: z.string(),
  eventId: z.string(),
  sendUpdates: z.string().nullable(),
  status: z.number(),
});

export async function googleDeletions(): Promise<
  z.infer<typeof deletionSchema>[]
> {
  const response = await fetch(`${FAKES}/__google/__deletions`);
  return z.array(deletionSchema).parse(await response.json());
}

// The newest confirm link emailed to this address, once it has arrived.
async function linkState(link: string): Promise<string> {
  const token = new URL(link).searchParams.get('confirm') ?? '';
  const response = await fetch(
    `${ORIGIN}/api/book/confirm?confirm=${encodeURIComponent(token)}`,
  );
  const body: unknown = await response.json().catch(() => null);
  const parsed = z.object({ state: z.string() }).safeParse(body);
  return parsed.success ? parsed.data.state : '';
}

export async function confirmLinkFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const mail = (await sentFor(email))
      .filter((entry) => entry.subject?.startsWith('Confirm'))
      .at(-1);
    const link = /(https?:\/\/\S+\?confirm=[\w.-]+)/.exec(
      mail?.text ?? '',
    )?.[1];
    // The link counts once its hash is stored, a moment after Resend took the email.
    if (link && (await linkState(link)) !== 'invalid') return link;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`no confirm link for ${email}`);
}

export function confirmLinksFor(mails: readonly FakeEmail[]): string[] {
  return mails.flatMap((mail) => {
    const link = /(https?:\/\/\S+\?confirm=[\w.-]+)/.exec(mail.text ?? '')?.[1];
    return link ? [link] : [];
  });
}

export function cancelLinkIn(text: string | null): string {
  const link = /Cancel this booking: (\S+)/.exec(text ?? '')?.[1];
  if (!link) throw new Error('no cancel link');
  return link;
}

export async function googleBusy(
  calendarId: string,
  intervals: ReadonlyArray<{ start: string; end: string }>,
): Promise<void> {
  await fetch(`${FAKES}/__google/__busy`, {
    method: 'POST',
    body: JSON.stringify({ calendarId, intervals }),
  });
}

export async function googleFail(
  op: 'token' | 'freebusy' | 'insert' | 'delete',
  count: number,
  status = 500,
): Promise<void> {
  await fetch(`${FAKES}/__google/__fail`, {
    method: 'POST',
    body: JSON.stringify({ op, count, status }),
  });
}

export const TOOL_SECRET = 'local-tool-secret';

export const ORIGIN =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';

// The envelope every tool answers in.
export const toolEnvelope = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  result: z.looseObject({ status: z.string().optional() }).optional(),
});

export const voiceSessionSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  token: z.string().optional(),
  sessionId: z.string().optional(),
});

// What the ElevenLabs agent sends with each tool call: the bearer secret and the
// session the site minted for this call after Turnstile.
export async function startVoiceSession(
  request: APIRequestContext,
  locale: 'en' | 'es' = 'en',
): Promise<string> {
  let failure = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request.post('/api/voice/session', {
      headers: { Origin: ORIGIN },
      data: {
        locale,
        page: '/',
        timeZone: 'Europe/Madrid',
        turnstileToken: 'e2e-token',
      },
    });
    const text = await response.text();
    const body = voiceSessionSchema.parse(JSON.parse(text));
    if (body.sessionId) return body.sessionId;
    failure = `no voice session: HTTP ${response.status()} ${text}`;
    if (body.error !== 'turnstile' && body.error !== 'unavailable') break;
  }
  throw new Error(failure);
}

export function agentHeaders(sessionId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${TOOL_SECRET}`,
    'X-Voice-Session': sessionId,
  };
}

export async function elevenLabsCalls(): Promise<
  Array<{ agentId: string; keyPresent: boolean }>
> {
  const response = await fetch(`${FAKES}/__elevenlabs/__calls`);
  return z
    .array(z.object({ agentId: z.string(), keyPresent: z.boolean() }))
    .parse(await response.json());
}

export async function elevenLabsReset(): Promise<void> {
  await fetch(`${FAKES}/__elevenlabs/__state`, { method: 'DELETE' });
}

export async function elevenLabsFail(
  count: number,
  status = 500,
): Promise<void> {
  await fetch(`${FAKES}/__elevenlabs/__fail`, {
    method: 'POST',
    body: JSON.stringify({ count, status }),
  });
}

export const TEST_CALENDAR = 'local-test';

// What the Confirm button on the emailed link posts, as a same-origin form.
export async function confirmByLink(
  request: APIRequestContext,
  link: string,
): Promise<number> {
  const url = new URL(link);
  const response = await request.post('/api/book/confirm', {
    headers: { Origin: ORIGIN },
    form: {
      token: url.searchParams.get('confirm') ?? '',
      locale: url.pathname.startsWith('/es') ? 'es' : 'en',
    },
    maxRedirects: 0,
  });
  return response.status();
}
