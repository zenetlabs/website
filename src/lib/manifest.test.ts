import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { messages } from '@/lib/i18n';

it('describes the site like the English meta description', () => {
  const manifest = z
    .object({ description: z.string() })
    .parse(JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')));
  expect(manifest.description).toBe(messages.en.meta.description);
});
