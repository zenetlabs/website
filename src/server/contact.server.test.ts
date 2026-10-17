import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ContactInput, contactSchema } from '@/lib/contact-schema';
import { submitContact } from '@/server/contact.server';

const CREDENTIALS = {
  resendApiKey: 're_test',
  turnstileSecret: 'ts_secret',
  remoteIp: '203.0.113.7',
};

const VALID: ContactInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  message: 'We would like to automate our inbox triage.',
  consent: true,
  turnstileToken: 'token',
  website: '',
  locale: 'es',
};

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function bodyOf(call: number): Record<string, unknown> {
  const init = fetchMock.mock.calls[call]?.[1];
  return JSON.parse(String(init?.body));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('submitContact', () => {
  it('returns ok without any fetch when the honeypot is filled', async () => {
    const result = await submitContact(
      { ...VALID, website: 'http://spam.example' },
      CREDENTIALS,
    );
    expect(result).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['success is false', { success: false }],
    ['the action does not match', { success: true, action: 'login' }],
    ['the action is missing', { success: true, hostname: 'zenetlabs.com' }],
    [
      'the hostname is wrong',
      { success: true, action: 'contact', hostname: 'evil.example' },
    ],
    [
      'the hostname only ends like the preview domain',
      {
        success: true,
        action: 'contact',
        hostname: 'evilzenetlabs.workers.dev',
      },
    ],
    [
      'the action is wrong on the real hostname',
      { success: true, action: 'login', hostname: 'zenetlabs.com' },
    ],
  ])('returns captcha and skips Resend when %s', async (_label, verdict) => {
    fetchMock.mockResolvedValueOnce(json(verdict));
    const result = await submitContact(VALID, CREDENTIALS);
    expect(result).toEqual({ ok: false, error: 'captcha' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'the testing key flag is set',
      {
        success: true,
        hostname: 'example.com',
        metadata: { result_with_testing_key: true },
      },
    ],
    [
      'the hostname is zenetlabs.com',
      { success: true, action: 'contact', hostname: 'zenetlabs.com' },
    ],
    [
      'the hostname is a workers.dev preview',
      {
        success: true,
        action: 'contact',
        hostname: 'abc123-prod-zenet-web.zenetlabs.workers.dev',
      },
    ],
  ])('continues to Resend when %s', async (_label, verdict) => {
    fetchMock
      .mockResolvedValueOnce(json(verdict))
      .mockResolvedValueOnce(json({ id: 'email_1' }));
    const result = await submitContact(VALID, CREDENTIALS);
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns captcha when the Turnstile request times out', async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException('timeout', 'TimeoutError'),
    );
    const result = await submitContact(VALID, CREDENTIALS);
    expect(result).toEqual({ ok: false, error: 'captcha' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends Resend the exact payload on success', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ success: true, action: 'contact', hostname: 'zenetlabs.com' }),
      )
      .mockResolvedValueOnce(json({ id: 'email_1' }));

    const result = await submitContact(VALID, CREDENTIALS);

    expect(result).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(bodyOf(0)).toEqual({
      secret: 'ts_secret',
      response: 'token',
      remoteip: '203.0.113.7',
    });

    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer re_test',
    );
    expect(bodyOf(1)).toEqual({
      from: 'Zenet Labs <noreply@zenetlabs.com>',
      to: ['admin@zenetlabs.com'],
      reply_to: ['ada@example.com'],
      subject: 'Website enquiry: Ada Lovelace',
      text: [
        'Name: Ada Lovelace',
        'Email: ada@example.com',
        'Company: Analytical Engines',
        'Locale: es',
        '',
        'We would like to automate our inbox triage.',
      ].join('\n'),
    });
  });

  it('omits the remote ip when there is none', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ success: true, action: 'contact', hostname: 'zenetlabs.com' }),
      )
      .mockResolvedValueOnce(json({ id: 'email_1' }));
    await submitContact(VALID, { ...CREDENTIALS, remoteIp: null });
    expect(bodyOf(0)).not.toHaveProperty('remoteip');
  });

  it.each([422, 500])(
    'returns send and logs no personal data when Resend answers %i',
    async (status) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock
        .mockResolvedValueOnce(
          json({ success: true, action: 'contact', hostname: 'zenetlabs.com' }),
        )
        .mockResolvedValueOnce(
          json(
            { name: 'validation_error', message: 'bad ada@example.com' },
            status,
          ),
        );

      const result = await submitContact(VALID, CREDENTIALS);

      expect(result).toEqual({ ok: false, error: 'send' });
      const logged = JSON.stringify(error.mock.calls);
      expect(logged).toContain(String(status));
      expect(logged).toContain('validation_error');
      expect(logged).not.toContain('ada@example.com');
      expect(logged).not.toContain('Ada');
    },
  );

  it('returns send when the Resend request itself fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(
        json({ success: true, action: 'contact', hostname: 'zenetlabs.com' }),
      )
      .mockRejectedValueOnce(new TypeError('network'));
    const result = await submitContact(VALID, CREDENTIALS);
    expect(result).toEqual({ ok: false, error: 'send' });
  });
});

describe('contactSchema', () => {
  it('accepts a valid submission without a company', () => {
    const { company: _company, ...rest } = VALID;
    expect(contactSchema.safeParse(rest).success).toBe(true);
  });

  it.each([
    ['missing consent', { consent: false }],
    ['a bad email', { email: 'not-an-email' }],
    ['an overlong message', { message: 'x'.repeat(5001) }],
    ['a short message', { message: 'too short' }],
    ['a newline in the name', { name: 'Ada\nBcc: evil@example.com' }],
    ['a control character in the company', { company: 'Acme\u0007' }],
    ['a C1 control in the name', { name: 'Ada\u0085Lovelace' }],
    ['a line separator in the name', { name: 'Ada\u2028Lovelace' }],
    ['a bidi override in the company', { company: 'Acme\u202E' }],
    ['an empty name', { name: '   ' }],
    ['an unknown locale', { locale: 'fr' }],
    ['an empty token', { turnstileToken: '' }],
    ['an overlong honeypot', { website: 'x'.repeat(201) }],
  ])('rejects %s', (_label, patch) => {
    expect(contactSchema.safeParse({ ...VALID, ...patch }).success).toBe(false);
  });
});
