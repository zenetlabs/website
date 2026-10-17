import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ALIAS_HOSTS, SITE_HOST } from '@/lib/redirects';

const wranglerSchema = z.object({
  env: z.object({
    production: z.object({
      routes: z.array(
        z.object({ pattern: z.string(), custom_domain: z.boolean() }),
      ),
    }),
  }),
});

describe('wrangler.jsonc production routes', () => {
  it('serve exactly the site host and its aliases as custom domains', () => {
    const source = readFileSync('wrangler.jsonc', 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    const { routes } = wranglerSchema.parse(JSON.parse(source)).env.production;
    expect(new Set(routes.map((route) => route.pattern))).toEqual(
      new Set([SITE_HOST, ...ALIAS_HOSTS]),
    );
    expect(routes.every((route) => route.custom_domain)).toBe(true);
  });
});
