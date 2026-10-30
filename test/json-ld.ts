import { PLACEHOLDER } from './placeholders';

const REQUIRED: Record<string, readonly string[]> = {
  Organization: ['name', 'url', 'logo'],
  ProfessionalService: ['name', 'url', 'address'],
  WebSite: ['name', 'url', 'inLanguage', 'publisher'],
  PostalAddress: [
    'streetAddress',
    'addressLocality',
    'postalCode',
    'addressCountry',
  ],
  Person: ['name'],
  PropertyValue: ['propertyID', 'value'],
  Offer: ['itemOffered'],
  Service: ['name'],
};

const URL_KEYS = new Set(['url', 'logo', 'image', '@id', 'item', 'sameAs']);
const SCRIPT =
  /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function jsonLdBlocks(html: string): unknown[] {
  return [...html.matchAll(SCRIPT)].map((match): unknown =>
    JSON.parse(match[1] ?? ''),
  );
}

export function validateJsonLd(
  blocks: readonly unknown[],
  origin: string,
): string[] {
  const problems: string[] = [];
  const defined = new Set<string>();
  const references: string[] = [];

  function checkString(key: string, value: string, path: string) {
    if (value === '') problems.push(`${path}: empty string`);
    if (PLACEHOLDER.test(value)) problems.push(`${path}: placeholder`);
    if (URL_KEYS.has(key) && !value.startsWith(`${origin}/`)) {
      problems.push(`${path}: not an absolute url on ${origin}`);
    }
    if (key === 'addressCountry' && !/^[A-Z]{2}$/.test(value)) {
      problems.push(`${path}: bad country code`);
    }
    if (key === 'priceCurrency' && !['SGD', 'EUR'].includes(value)) {
      problems.push(`${path}: bad currency`);
    }
    if (key === 'inLanguage' && !['en', 'es'].includes(value)) {
      problems.push(`${path}: bad language`);
    }
  }

  function checkValue(key: string, value: unknown, path: string) {
    if (value === null || value === undefined) {
      problems.push(`${path}: null`);
    } else if (typeof value === 'string') {
      checkString(key, value, path);
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value)) problems.push(`${path}: not finite`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) problems.push(`${path}: empty array`);
      value.forEach((item, index) => {
        checkValue(key, item, `${path}[${index}]`);
      });
    } else if (isRecord(value)) {
      checkNode(value, path);
    }
  }

  function checkNode(node: Record<string, unknown>, path: string) {
    const keys = Object.keys(node);
    const id = node['@id'];
    if (typeof id === 'string') {
      if (keys.length === 1) references.push(id);
      else if (defined.has(id)) problems.push(`${path}: duplicate ${id}`);
      else defined.add(id);
    }
    const type = node['@type'];
    if (typeof type === 'string') {
      const required = REQUIRED[type];
      if (!required) problems.push(`${path}: unknown type ${type}`);
      for (const key of required ?? []) {
        if (node[key] === undefined)
          problems.push(`${path}: ${type} lacks ${key}`);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === '@context' || key === '@type') continue;
      checkValue(key, value, `${path}.${key}`);
    }
  }

  blocks.forEach((block, index) => {
    const path = `block ${index}`;
    if (!isRecord(block)) {
      problems.push(`${path}: not an object`);
      return;
    }
    if (block['@context'] !== 'https://schema.org') {
      problems.push(`${path}: bad @context`);
    }
    if (typeof block['@type'] !== 'string') {
      problems.push(`${path}: no @type`);
    }
    checkNode(block, path);
  });

  for (const id of references) {
    if (!defined.has(id)) problems.push(`reference to undefined ${id}`);
  }
  return problems;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) {
    const fields = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

export function identityProblems(
  pages: ReadonlyMap<string, readonly unknown[]>,
): string[] {
  const first = new Map<string, { page: string; identity: string }>();
  const problems: string[] = [];
  for (const [page, blocks] of pages) {
    for (const block of blocks) {
      if (!isRecord(block) || typeof block['@id'] !== 'string') continue;
      if (Object.keys(block).length === 1) continue;
      const identity = canonical(block);
      const seen = first.get(block['@id']);
      if (!seen) first.set(block['@id'], { page, identity });
      else if (seen.identity !== identity) {
        problems.push(
          `${block['@id']} differs between ${seen.page} and ${page}`,
        );
      }
    }
  }
  return problems;
}
