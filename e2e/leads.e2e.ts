import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { attemptsFor, failFor, NOTIFY_TO, sentFor, uniqueEmail } from './fakes';
import { gotoHydrated } from './helpers';

const LABELS = {
  en: {
    name: 'Name',
    email: 'Email',
    company: 'Company (optional)',
    message: 'What should we look at?',
    submit: 'Send message',
    sent: 'Message sent',
  },
  es: {
    name: 'Nombre',
    email: 'Correo electrónico',
    company: 'Empresa (opcional)',
    message: '¿Qué deberíamos mirar?',
    submit: 'Enviar mensaje',
    sent: 'Mensaje enviado',
  },
} as const;

const MESSAGE =
  'Please automate our inbox triage. More at https://example.org/brief and www.example.net please.';

async function submit(
  page: Page,
  locale: 'en' | 'es',
  path: string,
  email: string,
) {
  const labels = LABELS[locale];
  await gotoHydrated(page, path);
  await page.getByLabel(labels.name).focus();
  await page.getByLabel(labels.name).fill('Ada Lovelace');
  await page.getByLabel(labels.email).fill(email);
  await page.getByLabel(labels.company).fill('Analytical Engines');
  await page.getByLabel(labels.message).fill(MESSAGE);
  await page.getByRole('checkbox').check();
  const button = page.getByRole('button', { name: labels.submit });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
  await expect(page.getByText(labels.sent)).toBeVisible({ timeout: 30_000 });
}

test('an English lead is stored, notified and acknowledged with a fixed confirmation', async ({
  page,
}) => {
  const email = uniqueEmail('en');
  await submit(
    page,
    'en',
    '/?utm_source=e2e&utm_medium=test&utm_campaign=r6&gclid=g1',
    email,
  );
  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
  const sent = await sentFor(email);

  const owner = sent.find((entry) => entry.to === NOTIFY_TO);
  expect(owner?.subject).toBe(
    '[TEST] [Lead EN] Ada Lovelace — Analytical Engines — form',
  );
  expect(owner?.replyTo).toBe(email);
  expect(owner?.text).toContain(
    'Landing page: /?utm_source=e2e&utm_medium=test&utm_campaign=r6&gclid=g1',
  );
  expect(owner?.text).toContain(
    'UTM: source=e2e · medium=test · campaign=r6 · term=- · content=-',
  );
  expect(owner?.text).toContain('gclid: g1');
  expect(owner?.text).toContain('Submitted from: /');
  expect(owner?.text).toContain(MESSAGE);

  const confirmation = sent.find((entry) => entry.to === email);
  expect(confirmation?.subject).toBe('We have your message | Zenet Labs');
  expect(confirmation?.replyTo).toBe('hello@zenetlabs.com');
  expect(confirmation?.text).not.toContain('Ada Lovelace');
  expect(confirmation?.text).not.toContain('Analytical Engines');
  expect(confirmation?.text).not.toContain('example.org');
  expect(confirmation?.text).not.toContain('example.net');
});

test('a Spanish lead gets Spanish copy and the page it came from', async ({
  page,
}) => {
  const email = uniqueEmail('es');
  await submit(page, 'es', '/es?utm_source=e2e-es', email);
  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
  const sent = await sentFor(email);

  const owner = sent.find((entry) => entry.to === NOTIFY_TO);
  expect(owner?.subject).toBe(
    '[TEST] [Lead ES] Ada Lovelace — Analytical Engines — form',
  );
  expect(owner?.text).toContain('Submitted from: /es');
  expect(owner?.text).toContain('source=e2e-es');

  const confirmation = sent.find((entry) => entry.to === email);
  expect(confirmation?.subject).toBe('Hemos recibido tu mensaje | Zenet Labs');
  expect(confirmation?.text).toContain('Gracias por escribir a Zenet Labs');
  expect(confirmation?.text).not.toContain('Please automate');
  expect(confirmation?.text).toMatch(/^https?:\/\/\S+\/es$/m);
});

test('a second lead from the same address gets no second confirmation', async ({
  page,
}) => {
  const email = uniqueEmail('cap');
  await submit(page, 'en', '/', email);
  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
  await submit(page, 'en', '/?utm_source=second', email);
  await expect
    .poll(async () => (await sentFor(email)).filter((e) => e.to === NOTIFY_TO))
    .toHaveLength(2);
  await page.waitForTimeout(1000);
  const sent = await sentFor(email);
  expect(sent.filter((entry) => entry.to === email)).toHaveLength(1);
  expect(sent.filter((entry) => entry.to === NOTIFY_TO)).toHaveLength(2);
});

test('failed sends are retried by the cron with the same idempotency keys', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('retry');
  await failFor(email, 2);
  await submit(page, 'en', '/', email);

  await expect
    .poll(async () => (await attemptsFor(email)).length)
    .toBeGreaterThanOrEqual(2);
  expect(await sentFor(email)).toHaveLength(0);
  const failed = await attemptsFor(email);
  expect(failed.every((entry) => entry.status === 500)).toBe(true);

  const time = Date.now() + 11 * 60_000;
  const cron = await request.get(
    `/cdn-cgi/local/scheduled?cron=*/10+*+*+*+*&time=${time}&format=json`,
  );
  expect((await cron.json()).outcome).toBe('ok');

  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
  const keys = (entries: typeof failed) =>
    entries.map((entry) => entry.idempotencyKey).sort();
  expect(keys(await sentFor(email))).toEqual(keys(failed));
});

test('the client bundle never contains server-only addresses or hosts', () => {
  const root = join(process.cwd(), 'dist', 'client');
  const forbidden = [
    NOTIFY_TO,
    '127.0.0.1:4175',
    'local-access-aud',
    'cloudflareaccess.com',
    'admin@zenetlabs.com',
  ];
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(entry.parentPath, entry.name));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const needle of forbidden) {
      expect(text.includes(needle), `${needle} in ${file}`).toBe(false);
    }
  }
});
