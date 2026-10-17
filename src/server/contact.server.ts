import { z } from 'zod';
import type { ContactInput, ContactResult } from '@/lib/contact-schema';
import { SITE_HOST } from '@/lib/redirects';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM = 'Zenet Labs <noreply@zenetlabs.com>';
const TO = 'admin@zenetlabs.com';
const TIMEOUT_MS = 10_000;

const siteverifySchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  hostname: z.string().optional(),
  metadata: z
    .object({ result_with_testing_key: z.boolean().optional() })
    .optional(),
});

const PREVIEW_SUFFIX = '.zenetlabs.workers.dev';

function isTrustedHost(hostname: string | undefined): boolean {
  return (
    hostname === SITE_HOST || (hostname?.endsWith(PREVIEW_SUFFIX) ?? false)
  );
}

const resendErrorSchema = z.object({ name: z.string() });

type Credentials = {
  resendApiKey: string;
  turnstileSecret: string;
  remoteIp?: string | null;
};

async function verifyTurnstile(
  token: string,
  { turnstileSecret, remoteIp }: Credentials,
): Promise<boolean> {
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const parsed = siteverifySchema.safeParse(await response.json());
    if (!parsed.success || !parsed.data.success) return false;
    const { action, hostname, metadata } = parsed.data;
    return (
      metadata?.result_with_testing_key === true ||
      (action === 'contact' && isTrustedHost(hostname))
    );
  } catch {
    return false;
  }
}

function emailText(input: ContactInput): string {
  return [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${input.company || '-'}`,
    `Locale: ${input.locale}`,
    '',
    input.message,
  ].join('\n');
}

async function resendErrorName(response: Response): Promise<string> {
  try {
    const parsed = resendErrorSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.name : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function sendEmail(
  input: ContactInput,
  { resendApiKey }: Credentials,
): Promise<boolean> {
  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: [input.email],
        subject: `Website enquiry: ${input.name}`,
        text: emailText(input),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return true;
    console.error(
      'contact: resend rejected the email',
      response.status,
      await resendErrorName(response),
    );
    return false;
  } catch {
    console.error('contact: resend request failed');
    return false;
  }
}

export async function submitContact(
  input: ContactInput,
  credentials: Credentials,
): Promise<ContactResult> {
  if (input.website !== '') return { ok: true };
  if (!(await verifyTurnstile(input.turnstileToken, credentials))) {
    return { ok: false, error: 'captcha' };
  }
  return (await sendEmail(input, credentials))
    ? { ok: true }
    : { ok: false, error: 'send' };
}
