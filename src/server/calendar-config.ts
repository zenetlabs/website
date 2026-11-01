import { z } from 'zod';
import { signingKey } from '@/server/google-auth';

// Placeholders the owner or CI may leave in the store until the real bundle exists.
const PLACEHOLDERS = new Set(['unset', 'unconfigured']);
const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';

const credentialsSchema = z.object({
  type: z.literal('service_account'),
  client_email: z.email(),
  private_key_id: z.string().min(1),
  private_key: z.string().startsWith(PEM_HEADER),
  subject: z.email(),
  calendar_id: z.string().min(1).max(256),
  test_calendar_id: z.string().min(1).max(256).optional(),
});

export type CalendarCredentials = z.infer<typeof credentialsSchema>;

export async function readSecret(
  binding: Pick<SecretsStoreSecret, 'get'>,
): Promise<string | null> {
  try {
    const value = (await binding.get()).trim();
    return value === '' || PLACEHOLDERS.has(value.toLowerCase()) ? null : value;
  } catch (error) {
    const missing = error instanceof Error && /not found/i.test(error.message);
    if (!missing) console.error('secret: unreadable');
    return null;
  }
}

let lastParsed: {
  raw: string;
  credentials: Promise<CalendarCredentials | null>;
} | null = null;

async function validate(raw: string): Promise<CalendarCredentials | null> {
  let credentials: CalendarCredentials | null = null;
  try {
    const parsed = credentialsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      // A PEM header with a broken body must read as not configured too.
      await signingKey(parsed.data);
      credentials = parsed.data;
    }
  } catch {
    // Not JSON, or an unusable key: handled below like any other invalid bundle.
  }
  if (credentials === null) console.error('booking: calendar secret invalid');
  return credentials;
}

// Memoized on the raw string: the bundle is parsed and its key imported once
// per isolate, and an invalid one is logged once, not on every request.
export function parseCalendarSecret(
  raw: string | null,
): Promise<CalendarCredentials | null> {
  if (raw === null) return Promise.resolve(null);
  if (lastParsed?.raw !== raw) {
    lastParsed = { raw, credentials: validate(raw) };
  }
  return lastParsed.credentials;
}

export function calendarIdFor(
  credentials: CalendarCredentials,
  isTest: boolean,
): string | null {
  return isTest
    ? (credentials.test_calendar_id ?? null)
    : credentials.calendar_id;
}

export function readCalendarSecret(
  env: Pick<Cloudflare.Env, 'GOOGLE_CALENDAR'>,
): Promise<string | null> {
  return readSecret(env.GOOGLE_CALENDAR);
}
