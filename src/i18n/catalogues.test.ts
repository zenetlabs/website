import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.set(path, value);
    else for (const [k, v] of flatten(value, path)) entries.set(k, v);
  }
  return entries;
}

const flatEn = flatten(en);
const flatEs = flatten(es);

describe('i18n catalogues', () => {
  it('has no key in en that es lacks', () => {
    const missing = [...flatEn.keys()].filter((key) => !flatEs.has(key));
    expect(missing).toEqual([]);
  });

  it('has no key in es that en lacks', () => {
    const extra = [...flatEs.keys()].filter((key) => !flatEn.has(key));
    expect(extra).toEqual([]);
  });

  it.each([
    ['en', flatEn],
    ['es', flatEs],
  ])('has no empty value in %s', (_locale, flat) => {
    const empty = [...flat].filter(([, value]) => value.trim() === '');
    expect(empty.map(([key]) => key)).toEqual([]);
  });
});
