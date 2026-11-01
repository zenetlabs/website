import { describe, expect, it } from 'vitest';
import { webmcpCopy as en } from '@/content/en/webmcp';
import { webmcpCopy as es } from '@/content/es/webmcp';
import { locales } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { WEBMCP_TOOL_NAMES } from '@/lib/webmcp/names';
import {
  ANNOTATIONS,
  type Executors,
  isToolManifest,
  type ManifestEntry,
  type ToolManifest,
  toWebMcpTools,
} from '@/lib/webmcp/tools';
import { manifest } from '@/server/tools/registry';

const COPY = { en, es };
const FLAGS = {
  calculator: { published: true },
  booking: { published: true },
};

function fixture(): ToolManifest {
  const built = manifest(FLAGS);
  if (!isToolManifest(built)) throw new Error('the registry manifest is bad');
  return built;
}

const executors: Executors = {
  get_faq: () => Promise.resolve({ ok: true, result: 'faq' }),
  get_pricing: () => Promise.resolve({ ok: true, result: 'pricing' }),
  estimate_project: () => Promise.resolve({ ok: true, result: 'estimate' }),
  check_availability: () => Promise.resolve({ ok: true, result: 'slots' }),
  book_meeting: () => Promise.resolve({ ok: true, result: 'book' }),
  navigate: () => Promise.resolve({ ok: true, result: 'navigate' }),
};

function requiredOf(schema: Record<string, unknown>): unknown[] {
  return Array.isArray(schema.required) ? schema.required : [];
}

function propertiesOf(schema: Record<string, unknown>) {
  return isRecord(schema.properties) ? schema.properties : {};
}

describe('toWebMcpTools', () => {
  for (const locale of locales) {
    describe(locale, () => {
      const source = fixture();
      const copy = COPY[locale];
      const tools = toWebMcpTools(source, locale, copy, executors);

      it('maps exactly the six tools, in order, with valid names', () => {
        expect(tools.map((tool) => tool.name)).toEqual([...WEBMCP_TOOL_NAMES]);
        for (const tool of tools) {
          expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
        }
      });

      it('describes and titles every tool in the page language', () => {
        for (const tool of tools) {
          const entry = source.tools.find(({ name }) => name === tool.name);
          expect(tool.title.length, tool.name).toBeGreaterThan(0);
          expect(tool.title).toBe(copy.titles[tool.name]);
          if (tool.name !== 'book_meeting') {
            expect(
              tool.description.startsWith(entry?.description[locale] ?? '#'),
            ).toBe(true);
          }
        }
      });

      it('replaces the server sentence about confirmed details on book_meeting', () => {
        const book = tools.find(({ name }) => name === 'book_meeting');
        const served =
          source.tools.find(({ name }) => name === 'book_meeting')?.description[
            locale
          ] ?? '';
        const gone =
          locale === 'en'
            ? 'Only call it after the visitor has confirmed'
            : 'Llámala solo cuando el visitante haya confirmado';
        expect(served).toContain(gone);
        expect(book?.description).not.toContain(gone);
        expect(book?.description).toContain(copy.notes.book_meeting);
        expect(book?.description.startsWith(served.split('. ')[0] ?? '#')).toBe(
          true,
        );
        expect(book?.description).toContain(
          locale === 'en' ? 'pass only the slot' : 'pasa solo el horario',
        );
      });

      it('removes locale from every schema', () => {
        for (const tool of tools) {
          expect(propertiesOf(tool.inputSchema)).not.toHaveProperty('locale');
          expect(requiredOf(tool.inputSchema)).not.toContain('locale');
          expect(tool.inputSchema.type).toBe('object');
        }
      });

      it('leaves name, email and company to the visitor on book_meeting', () => {
        const book = tools.find(({ name }) => name === 'book_meeting');
        expect(requiredOf(book?.inputSchema ?? {}).sort()).toEqual([
          'slot',
          'topic',
        ]);
        expect(propertiesOf(book?.inputSchema ?? {})).toHaveProperty('email');
      });

      it('keeps every other property exactly as the manifest has it', () => {
        for (const tool of tools) {
          const entry = source.tools.find(({ name }) => name === tool.name);
          const { locale: _dropped, ...kept } = propertiesOf(
            entry?.inputSchema ?? {},
          );
          expect(propertiesOf(tool.inputSchema)).toEqual(kept);
        }
      });

      it('serialises to JSON unchanged and carries the annotations', () => {
        for (const tool of tools) {
          expect(structuredClone(tool.inputSchema)).toEqual(tool.inputSchema);
          expect(tool.annotations).toEqual(ANNOTATIONS[tool.name]);
        }
        expect(ANNOTATIONS.book_meeting.consequentialHint).toBe(true);
        expect(ANNOTATIONS.get_pricing.readOnlyHint).toBe(true);
      });
    });
  }

  it('does not mutate the manifest', () => {
    const source = fixture();
    const before = JSON.stringify(source);
    toWebMcpTools(source, 'en', COPY.en, executors);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('skips tools it does not know and tolerates missing ones', () => {
    const source = fixture();
    const extra: ManifestEntry = {
      name: 'delete_everything',
      description: { en: 'x', es: 'x' },
      inputSchema: { type: 'object' },
    };
    const tools = toWebMcpTools(
      { version: 1, tools: [extra, ...source.tools.slice(0, 2)] },
      'en',
      COPY.en,
      executors,
    );
    expect(tools.map(({ name }) => name)).toEqual(['get_faq', 'get_pricing']);
  });

  it('omits the booking tools when the manifest does', () => {
    const built = manifest({ ...FLAGS, booking: { published: false } });
    if (!isToolManifest(built)) throw new Error('bad manifest');
    const names = toWebMcpTools(built, 'en', COPY.en, executors).map(
      ({ name }) => name,
    );
    expect(names).not.toContain('book_meeting');
    expect(names).not.toContain('check_availability');
    expect(names).toContain('navigate');
  });
});

describe('isToolManifest', () => {
  const entry = {
    name: 'get_faq',
    description: { en: 'a', es: 'b' },
    inputSchema: { type: 'object' },
  };

  it('accepts the live manifest', () => {
    expect(isToolManifest(manifest(FLAGS))).toBe(true);
  });

  it.each([
    ['another version', { version: 2, tools: [entry] }],
    ['tools that are not an array', { version: 1, tools: {} }],
    [
      'a missing Spanish description',
      {
        version: 1,
        tools: [{ ...entry, description: { en: 'a' } }],
      },
    ],
    [
      'a string schema',
      { version: 1, tools: [{ ...entry, inputSchema: 'x' }] },
    ],
    [
      'a non-object schema',
      {
        version: 1,
        tools: [{ ...entry, inputSchema: { type: 'string' } }],
      },
    ],
    ['null', null],
    ['an array', []],
  ])('rejects %s', (_label, value) => {
    expect(isToolManifest(value)).toBe(false);
  });
});
