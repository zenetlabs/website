// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  calendarIdFor,
  parseCalendarSecret,
  readSecret,
} from '@/server/calendar-config';
import { signingCredentials } from '../../test/google';

let VALID: Awaited<ReturnType<typeof signingCredentials>>['credentials'] & {
  extra: string;
};

beforeAll(async () => {
  VALID = { ...(await signingCredentials()).credentials, extra: 'ignored' };
});

afterEach(() => vi.restoreAllMocks());

function secret(value: string | Error): Pick<SecretsStoreSecret, 'get'> {
  return {
    get: async () => {
      if (value instanceof Error) throw value;
      return value;
    },
  };
}

describe('parseCalendarSecret', () => {
  it('parses a valid bundle and drops unknown keys', async () => {
    const parsed = await parseCalendarSecret(JSON.stringify(VALID));
    expect(parsed?.calendar_id).toBe('main-calendar');
    expect(parsed).not.toHaveProperty('extra');
  });

  it('treats a missing value as not configured, silently', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await parseCalendarSecret(null)).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it.each([
    ['bad JSON', () => '{not json'],
    [
      'a missing subject',
      () => JSON.stringify({ ...VALID, subject: undefined }),
    ],
    [
      'a non-PEM key',
      () => JSON.stringify({ ...VALID, private_key: 'secret-key-material' }),
    ],
    [
      'a PEM header over a broken body',
      () =>
        JSON.stringify({
          ...VALID,
          private_key:
            '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
        }),
    ],
    [
      'a wrong type',
      () => JSON.stringify({ ...VALID, type: 'authorized_user' }),
    ],
    [
      'an empty calendar id',
      () => JSON.stringify({ ...VALID, calendar_id: '' }),
    ],
  ])('rejects %s without leaking any value', async (_label, make) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await parseCalendarSecret(make())).toBeNull();
    expect(log).toHaveBeenCalledWith('booking: calendar secret invalid');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /secret-key-material|owner@example|abc/,
    );
  });
});

describe('readSecret', () => {
  it('returns the trimmed value', async () => {
    await expect(readSecret(secret(' value\n'))).resolves.toBe('value');
  });

  it.each(['UNSET', 'unset', 'unconfigured', 'Unconfigured\n', '', '  '])(
    'reads %j as not configured',
    async (value) => {
      await expect(readSecret(secret(value))).resolves.toBeNull();
    },
  );

  it('maps "Secret not found" to null without logging', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      readSecret(secret(new Error('Secret not found'))),
    ).resolves.toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it('logs other read failures by name only', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      readSecret(secret(new Error('boom: key=abc'))),
    ).resolves.toBeNull();
    expect(log).toHaveBeenCalledWith('secret: unreadable');
  });
});

describe('the unconfigured placeholder and invalid bundles', () => {
  it('is not configured and never logged, as it never reaches the parser', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const raw = await readSecret(secret('unconfigured'));
    expect(await parseCalendarSecret(raw)).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it('parses an invalid bundle once per distinct value and logs it once', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await parseCalendarSecret('{"half":')).toBeNull();
    }
    expect(log).toHaveBeenCalledTimes(1);
    expect(await parseCalendarSecret(JSON.stringify(VALID))).not.toBeNull();
    expect(await parseCalendarSecret('{"half":')).toBeNull();
    expect(log).toHaveBeenCalledTimes(2);
  });
});

describe('calendarIdFor', () => {
  it('picks the main or the test calendar', async () => {
    const credentials = await parseCalendarSecret(JSON.stringify(VALID));
    if (!credentials) throw new Error('fixture failed to parse');
    expect(calendarIdFor(credentials, false)).toBe('main-calendar');
    expect(calendarIdFor(credentials, true)).toBe('test-calendar');
    expect(
      calendarIdFor({ ...credentials, test_calendar_id: undefined }, true),
    ).toBeNull();
  });
});
