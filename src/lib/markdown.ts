export type MarkdownToken =
  | { kind: 'open'; tag: string; href: string | null; hidden: boolean }
  | { kind: 'close' }
  | { kind: 'text'; text: string };

export type CapturedPage = {
  title: string;
  description: string;
  canonical: string;
  url: string;
  jsonLd: string[];
  tokens: MarkdownToken[];
};

type Range = { type: string; q: number; index: number };

function parseRanges(accept: string): Range[] {
  return accept.split(',').flatMap((part, index) => {
    const [rawType = '', ...params] = part.split(';');
    const type = rawType.trim().toLowerCase();
    const qParam = params
      .map((param) => param.trim().toLowerCase())
      .find((param) => param.startsWith('q='));
    const q = qParam === undefined ? 1 : Number(qParam.slice(2));
    if (!type.includes('/') || !Number.isFinite(q)) return [];
    return [{ type, q, index }];
  });
}

export function prefersMarkdown(accept: string | null): boolean {
  if (!accept || !/markdown|text\/\*/i.test(accept)) return false;
  const ranges = parseRanges(accept);
  const byType = (type: string) => ranges.find((range) => range.type === type);
  const markdown = byType('text/markdown') ?? byType('text/*');
  if (!markdown || markdown.q <= 0) return false;
  const html = byType('text/html') ?? byType('text/*') ?? byType('*/*');
  if (!html) return true;
  return (
    markdown.q > html.q ||
    (markdown.q === html.q && markdown.index <= html.index)
  );
}

const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
]);

function fromCodePoint(code: number): string {
  const invalid =
    code === 0 || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff;
  return invalid ? '\uFFFD' : String.fromCodePoint(code);
}

export function decodeEntities(raw: string): string {
  return raw.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (match, decimal?: string, hex?: string, name?: string) => {
      if (decimal !== undefined) {
        return fromCodePoint(Number.parseInt(decimal, 10));
      }
      if (hex !== undefined) {
        return fromCodePoint(Number.parseInt(hex, 16));
      }
      return NAMED_ENTITIES.get(name ?? '') ?? match;
    },
  );
}

const PREFIXES: ReadonlyMap<string, string> = new Map([
  ...[1, 2, 3, 4, 5, 6].map((level): [string, string] => [
    `h${level}`,
    `${'#'.repeat(level)} `,
  ]),
  ['li', '- '],
  ...[
    'address',
    'article',
    'aside',
    'blockquote',
    'dd',
    'details',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'header',
    'main',
    'ol',
    'p',
    'section',
    'summary',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
  ].map((tag): [string, string] => [tag, '']),
]);

const MARKS: ReadonlyMap<string, string> = new Map([
  ['b', '**'],
  ['strong', '**'],
  ['em', '*'],
  ['i', '*'],
]);

const SKIPPED: ReadonlySet<string> = new Set([
  'button',
  'form',
  'iframe',
  'nav',
  'noscript',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
]);

type Frame = {
  tag: string;
  kind: 'skip' | 'block' | 'mark' | 'link' | 'blockLink' | 'inline';
  url: string;
  start: number;
  linked: boolean;
};

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>]/g, '\\$&');
}

function absolute(href: string, base: string): string {
  const decoded = decodeEntities(href);
  const resolved = URL.canParse(decoded, base)
    ? new URL(decoded, base).href
    : decoded;
  return resolved.replace(
    /[()\s]/g,
    (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
  );
}

function linkLabel(url: string): string {
  return (URL.canParse(url) ? new URL(url).host : '') || url;
}

function bodyToMarkdown(tokens: MarkdownToken[], base: string): string {
  const blocks: string[] = [];
  const frames: Frame[] = [];
  let skipped = 0;
  let inline = '';
  let prefix = '';

  const space = () => {
    if (inline !== '' && !/\s$/.test(inline)) inline += ' ';
  };

  const flush = () => {
    const text = inline.replace(/\s+/g, ' ').trim();
    if (text) blocks.push(prefix + text);
    inline = '';
    prefix = '';
  };

  for (const token of tokens) {
    if (token.kind === 'text') {
      if (skipped === 0) inline += escapeMarkdown(token.text);
      continue;
    }

    if (token.kind === 'open') {
      const { tag, href } = token;
      const frame: Frame = {
        tag,
        kind: 'inline',
        url: '',
        start: 0,
        linked: false,
      };
      frames.push(frame);
      if (skipped > 0 || token.hidden || SKIPPED.has(tag)) {
        frame.kind = 'skip';
        skipped++;
        continue;
      }
      const blockPrefix = PREFIXES.get(tag);
      if (blockPrefix !== undefined) {
        frame.kind = 'block';
        const link = frames.findLast((entry) => entry.kind === 'link');
        if (link) link.kind = 'blockLink';
        flush();
        prefix = blockPrefix;
        if (tag === 'dt') inline = '**';
      } else if (MARKS.has(tag)) {
        frame.kind = 'mark';
        inline += MARKS.get(tag);
      } else {
        space();
        if (tag === 'a' && href !== null) {
          frame.kind = 'link';
          frame.url = absolute(href, base);
          frame.start = inline.length;
        }
      }
      continue;
    }

    const frame = frames.pop();
    if (!frame) continue;
    switch (frame.kind) {
      case 'skip':
        skipped--;
        break;
      case 'block': {
        if (prefix.startsWith('#')) {
          const link = frames.findLast(
            (entry) => entry.kind === 'blockLink' && !entry.linked,
          );
          if (link) {
            inline = `[${inline.trim() || linkLabel(link.url)}](${link.url})`;
            link.linked = true;
          }
        }
        if (frame.tag === 'dt') inline = `${inline.trimEnd()}**`;
        flush();
        break;
      }
      case 'mark':
        inline += MARKS.get(frame.tag);
        break;
      case 'link':
        inline = `${inline.slice(0, frame.start)}[${inline.slice(frame.start).trimEnd()}](${frame.url})`;
        break;
      case 'blockLink': {
        flush();
        if (!frame.linked) {
          blocks.push(`[${linkLabel(frame.url)}](${frame.url})`);
        }
        break;
      }
      case 'inline':
        space();
        break;
    }
  }
  flush();

  return blocks.join('\n\n').replace(/^(- .*)\n\n(?=- )/gm, '$1\n');
}

export function tidy(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

export function pageToMarkdown(page: CapturedPage): string {
  const fields = [
    ['title', page.title],
    ['description', page.description],
    ['canonical', page.canonical],
  ].filter(([, value]) => value !== '');
  const frontmatter =
    fields.length > 0
      ? `---\n${fields.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---`
      : '';

  const fences = page.jsonLd
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `\`\`\`json\n${block}\n\`\`\``);

  const body = bodyToMarkdown(page.tokens, page.canonical || page.url);
  const parts = [frontmatter, body, ...fences].filter(Boolean);
  return `${parts.join('\n\n')}\n`;
}
