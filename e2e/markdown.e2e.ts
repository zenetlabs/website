import { expect, test } from '@playwright/test';
import { PAGES } from './helpers';

const VARY_ACCEPT = /(^|,)\s*accept\s*(,|$)/i;

function canonicalPath(link: string | undefined): string {
  const match = /^<([^>]+)>; rel="canonical"$/.exec(link ?? '');
  return match?.[1] ? new URL(match[1]).pathname : '';
}

for (const path of PAGES) {
  test(`${path} is served as markdown`, async ({ request }) => {
    const response = await request.get(path, {
      headers: { accept: 'text/markdown' },
    });
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(headers.vary).toMatch(VARY_ACCEPT);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(canonicalPath(headers.link)).toBe(path);

    const body = await response.text();
    expect(body.startsWith('---\ntitle: "')).toBe(true);
    const frontmatter = body.split('\n---\n')[0] ?? '';
    expect(frontmatter).toContain('\ndescription: "');
    const canonical = /^canonical: "([^"]+)"$/m.exec(frontmatter);
    expect(new URL(canonical?.[1] ?? '').pathname).toBe(path);
    expect(body).toMatch(/^# \S/m);
    expect(body).not.toMatch(/<\/?[a-z][^>]*>/);

    const fences = Array.from(body.matchAll(/```json\n([\s\S]*?)\n```/g));
    expect(fences).toHaveLength(2);
    for (const [, json] of fences) {
      const parsed: unknown = JSON.parse(json ?? '');
      expect(parsed).toBeTruthy();
    }
  });
}

test('the home markdown keeps content and drops chrome', async ({
  request,
}) => {
  const response = await request.get('/', {
    headers: { accept: 'text/markdown' },
  });
  const body = await response.text();
  for (const expected of [
    '# Turn your company into an *agentic company*.',
    '## From curiosity to an *AI-native* operating model',
    '- AI literacy for leadership and teams\n- Hands-on workshops',
    '### [Viatsy](https://viatsy.com/)\n\nSmall-group trips to Japan, China, Korea, Taiwan and Hong Kong.',
    '[hello@zenetlabs.com](mailto:hello@zenetlabs.com)',
    "We don't just advise.",
  ]) {
    expect(body).toContain(expected);
  }
  for (const unexpected of [
    'Skip to content',
    'What should we look at?',
    'Send message',
    'triaged the shared inbox',
    'UEN 202202371M',
  ]) {
    expect(body).not.toContain(unexpected);
  }
});

const NEGOTIATION: ReadonlyArray<readonly [string, string]> = [
  ['text/markdown, text/html;q=0.9', 'text/markdown'],
  ['text/*', 'text/markdown'],
  [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8',
    'text/html',
  ],
  ['text/markdown;q=0.5, text/html', 'text/html'],
  ['text/html, text/markdown', 'text/html'],
  ['*/*', 'text/html'],
];

for (const [accept, type] of NEGOTIATION) {
  test(`Accept "${accept}" gets ${type}`, async ({ request }) => {
    const response = await request.get('/', { headers: { accept } });
    expect(response.headers()['content-type']).toMatch(new RegExp(`^${type}`));
    expect(response.headers().vary).toMatch(VARY_ACCEPT);
  });
}

for (const path of ['/nope', '/es/nope']) {
  test(`${path} answers 404 as markdown without a canonical link`, async ({
    request,
  }) => {
    const response = await request.get(path, {
      headers: { accept: 'text/markdown' },
    });
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers().link).toBeUndefined();
  });
}

test('HEAD with a markdown Accept returns the markdown headers and no body', async ({
  request,
}) => {
  const response = await request.head('/', {
    headers: { accept: 'text/markdown' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe(
    'text/markdown; charset=utf-8',
  );
  expect(canonicalPath(response.headers().link)).toBe('/');
  expect(response.headers().vary).toMatch(VARY_ACCEPT);
  expect((await response.body()).length).toBe(0);
});

test('POST is never converted to markdown', async ({ request }) => {
  const response = await request.post('/', {
    headers: { accept: 'text/markdown' },
  });
  expect(response.headers()['content-type'] ?? '').not.toContain(
    'text/markdown',
  );
});
