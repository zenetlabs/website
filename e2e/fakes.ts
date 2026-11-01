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
  op: 'token' | 'freebusy' | 'insert',
  count: number,
  status = 500,
): Promise<void> {
  await fetch(`${FAKES}/__google/__fail`, {
    method: 'POST',
    body: JSON.stringify({ op, count, status }),
  });
}

export const TOOL_SECRET = 'local-tool-secret';

export const TEST_CALENDAR = 'local-test';
