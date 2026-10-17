import { env } from 'cloudflare:workers';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { type ContactResult, contactSchema } from '@/lib/contact-schema';
import { submitContact } from '@/server/contact.server';

async function readSecrets(): Promise<[string, string] | null> {
  try {
    return await Promise.all([
      env.RESEND_API_KEY.get(),
      env.TURNSTILE_SECRET_KEY.get(),
    ]);
  } catch {
    console.error('contact: secrets unavailable');
    return null;
  }
}

export const sendContact = createServerFn({ method: 'POST' })
  .validator(contactSchema)
  .handler(async ({ data }): Promise<ContactResult> => {
    if (data.website !== '') return { ok: true };
    const secrets = await readSecrets();
    if (!secrets) return { ok: false, error: 'send' };
    const [resendApiKey, turnstileSecret] = secrets;
    return submitContact(data, {
      resendApiKey,
      turnstileSecret,
      remoteIp: getRequestHeader('CF-Connecting-IP'),
    });
  });
