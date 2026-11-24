import { plainText } from '@/lib/markdown';

// Reads the format `pageToMarkdown` writes (`src/lib/markdown.ts`): JSON
// frontmatter, the body, then one json fence per JSON-LD block.
export const PART_MAX = 1500;

const FENCE = '\n```json\n';
const HEADING = /^(#{1,6}) (.+)$/;
export type Outline = {
  title: string;
  description: string;
  sections: string[];
};

type Heading = { label: string; line: string; start: number };

// A page split once: its outline and the body the sections are cut from.
export type ParsedPage = Outline & { body: string; headings: Heading[] };

function split(markdown: string): { front: string; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(markdown);
  const front = match?.[1] ?? '';
  const rest = match ? markdown.slice(match[0].length) : markdown;
  const fence = rest.indexOf(FENCE);
  return { front, body: fence === -1 ? rest : rest.slice(0, fence) };
}

function frontField(front: string, key: string): string {
  const line = front.split('\n').find((entry) => entry.startsWith(`${key}: `));
  if (line === undefined) return '';
  try {
    const value: unknown = JSON.parse(line.slice(key.length + 2));
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function normalise(label: string): string {
  return label
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function headingsOf(body: string): Heading[] {
  const found: Heading[] = [];
  const seen = new Map<string, number>();
  let offset = 0;
  for (const line of body.split('\n')) {
    const match = HEADING.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      const plain = plainText(match[2]).replace(/\s+/g, ' ').trim();
      // A heading that repeats (two "Questions") gets an ordinal from the
      // second on, so every label names one section.
      const count = (seen.get(normalise(plain)) ?? 0) + 1;
      seen.set(normalise(plain), count);
      const label = count === 1 ? plain : `${plain} (${count})`;
      found.push({ label, line: `${match[1]} ${label}`, start: offset });
    }
    offset += line.length + 1;
  }
  return found;
}

export function parsePage(markdown: string): ParsedPage {
  const { front, body } = split(markdown);
  const headings = headingsOf(body);
  return {
    title: frontField(front, 'title'),
    description: frontField(front, 'description'),
    sections: headings.map((heading) => heading.line),
    body,
    headings,
  };
}

function cutAtWords(text: string): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > PART_MAX) {
    const space = rest.lastIndexOf(' ', PART_MAX);
    const at = space > 0 ? space : PART_MAX;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest !== '') out.push(rest);
  return out;
}

function toParts(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (const paragraph of text.split(/\n{2,}/)) {
    const pieces =
      paragraph.length > PART_MAX ? cutAtWords(paragraph) : [paragraph];
    for (const piece of pieces) {
      if (current === '') {
        current = piece;
      } else if (current.length + 2 + piece.length <= PART_MAX) {
        current = `${current}\n\n${piece}`;
      } else {
        parts.push(current);
        current = piece;
      }
    }
  }
  if (current !== '') parts.push(current);
  return parts.length > 0 ? parts : [''];
}

export type SectionParts = {
  heading: string;
  parts: string[];
  next: string | null;
};

// The text under one heading, up to the next heading of any level, with links
// reduced to their text and cut into parts of at most PART_MAX characters.
export function sectionParts(
  { body, headings }: ParsedPage,
  label: string,
): SectionParts | null {
  const wanted = normalise(plainText(label));
  const index = headings.findIndex(
    (heading) => normalise(heading.label) === wanted,
  );
  const heading = headings[index];
  if (heading === undefined) return null;
  const from = heading.start + body.slice(heading.start).indexOf('\n') + 1;
  const to = headings[index + 1]?.start ?? body.length;
  const text = plainText(from > heading.start ? body.slice(from, to) : '');
  return {
    heading: heading.line,
    parts: toParts(text.trim()),
    next: headings[index + 1]?.line ?? null,
  };
}
