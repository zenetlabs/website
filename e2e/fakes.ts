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
