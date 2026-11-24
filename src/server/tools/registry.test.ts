import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { locales } from '@/lib/i18n';
import {
  enabledTools,
  manifest,
  offeredTools,
  TOOLS,
  toolByName,
} from '@/server/tools/registry';

const flags = (booking: boolean, calculator: boolean) => ({
  calculator: { published: calculator },
  booking: { published: booking },
});
const names = (tools: readonly { name: string }[]) =>
  tools.map((tool) => tool.name);

describe('TOOLS', () => {
  it('has ten uniquely named snake_case tools, none over 30 characters', () => {
    expect(TOOLS.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'check_availability',
      'book_meeting',
      'navigate',
      'list_pages',
      'get_page',
      'search_site',
      'open_contact_form',
    ]);
    for (const tool of TOOLS) {
      expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(tool.name.length).toBeLessThanOrEqual(30);
    }
  });

  it('describes every tool in every locale', () => {
    for (const tool of TOOLS) {
      for (const locale of locales) {
        expect(
          tool.description[locale].length,
          `${tool.name}/${locale}`,
        ).toBeGreaterThan(40);
      }
    }
  });

  it('keeps the new descriptions and parameter descriptions inside Chrome budgets', () => {
    for (const name of [
      'list_pages',
      'get_page',
      'search_site',
      'open_contact_form',
    ]) {
      const tool = toolByName(name);
      for (const locale of locales) {
        expect(
          tool?.description[locale].length,
          `${name}/${locale}`,
        ).toBeLessThanOrEqual(500);
      }
      const schema = tool && z.toJSONSchema(tool.input, { io: 'input' });
      const properties =
        schema && 'properties' in schema && schema.properties
          ? Object.entries(schema.properties)
          : [];
      for (const [key, value] of properties) {
        if (key === 'locale') continue;
        const text =
          typeof value === 'object' && 'description' in value
            ? value.description
            : undefined;
        expect(text, `${name}.${key}`).toBeTypeOf('string');
        expect(text?.length, `${name}.${key}`).toBeLessThanOrEqual(150);
      }
    }
  });

  it('converts every schema to JSON Schema objects without throwing', () => {
    for (const tool of TOOLS) {
      const input = z.toJSONSchema(tool.input, { io: 'input' });
      expect(input.type, tool.name).toBe('object');
      expect(z.toJSONSchema(tool.output), tool.name).toBeTypeOf('object');
    }
  });

  it('makes defaulted fields optional for callers', () => {
    for (const tool of TOOLS) {
      const input = z.toJSONSchema(tool.input, { io: 'input' });
      const required =
        'required' in input && Array.isArray(input.required)
          ? input.required
          : [];
      expect(required, tool.name).not.toContain('locale');
    }
  });

  it('tells agents that book_meeting only holds the time until the visitor confirms from the email', () => {
    const tool = toolByName('book_meeting');
    expect(tool?.description.en).toContain(
      'only when they open it and press Confirm',
    );
    expect(tool?.description.es).toContain(
      'solo cuando lo abre y pulsa Confirmar',
    );
  });

  it('keeps navigate client-only and book_meeting the only mutating tool', () => {
    expect(toolByName('navigate')).toMatchObject({
      clientOnly: true,
      readOnly: true,
    });
    expect('run' in (toolByName('navigate') ?? {})).toBe(false);
    expect(
      TOOLS.filter((tool) => !tool.readOnly).map((tool) => tool.name),
    ).toEqual(['book_meeting']);
    expect(
      TOOLS.filter((tool) => tool.clientOnly).map((tool) => tool.name),
    ).toEqual(['navigate', 'open_contact_form']);
  });

  it('looks tools up by name', () => {
    expect(toolByName('get_faq')?.name).toBe('get_faq');
    expect(toolByName('nope')).toBeUndefined();
    expect(toolByName('__proto__')).toBeUndefined();
  });
});

describe('enabledTools', () => {
  it('drops the booking tools while the booking flag is off, and nothing else', () => {
    expect(names(enabledTools(flags(true, true)))).toEqual(
      TOOLS.map((tool) => tool.name),
    );
    expect(names(enabledTools(flags(false, true)))).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'navigate',
      'list_pages',
      'get_page',
      'search_site',
      'open_contact_form',
    ]);
  });

  it('drops the estimate while the calculator is dark', () => {
    expect(names(enabledTools(flags(true, false)))).not.toContain(
      'estimate_project',
    );
    expect(names(enabledTools(flags(true, true)))).toContain(
      'estimate_project',
    );
  });
});

describe('tool flags', () => {
  it('reads who is offered a tool, what a client tool opens and what a call costs from the definitions', () => {
    expect(
      TOOLS.filter((tool) => !tool.surfaces.includes('chat')).map(
        (tool) => tool.name,
      ),
    ).toEqual(['list_pages']);
    expect(
      TOOLS.flatMap((tool) =>
        tool.clientOnly ? [[tool.name, tool.opens]] : [],
      ),
    ).toEqual([
      ['navigate', 'page'],
      ['open_contact_form', 'contactForm'],
    ]);
    expect(
      TOOLS.flatMap((tool) =>
        !tool.clientOnly && tool.cost !== 1 ? [[tool.name, tool.cost]] : [],
      ),
    ).toEqual([['get_page', 3]]);
  });
});

describe('offeredTools', () => {
  it('is the enabled tools without the WebMCP-only page list, under every flag combination', () => {
    for (const booking of [true, false]) {
      for (const calculator of [true, false]) {
        const site = flags(booking, calculator);
        expect(names(offeredTools(site, 'chat'))).toEqual(
          names(enabledTools(site)).filter((name) => name !== 'list_pages'),
        );
        expect(names(offeredTools(site, 'chat'))).toEqual(
          expect.arrayContaining([
            'get_page',
            'search_site',
            'open_contact_form',
            'get_faq',
            'navigate',
          ]),
        );
      }
    }
  });

  it('gives voice the same tools as chat today, and neither the page list', () => {
    const site = flags(true, false);
    expect(names(offeredTools(site, 'voice'))).toEqual(
      names(offeredTools(site, 'chat')),
    );
    expect(names(offeredTools(site, 'voice'))).not.toContain('list_pages');
  });

  it('offers eight tools in production (booking on, calculator dark)', () => {
    expect(names(offeredTools(flags(true, false), 'chat'))).toEqual([
      'get_faq',
      'get_pricing',
      'check_availability',
      'book_meeting',
      'navigate',
      'get_page',
      'search_site',
      'open_contact_form',
    ]);
  });
});

describe('manifest', () => {
  const ON = flags(true, true);
  const OFF = flags(false, true);
  const { tools } = manifest(ON);

  it('is versioned and lists the ten tools with schemas', () => {
    expect(manifest(ON).version).toBe(1);
    expect(tools).toHaveLength(10);
    for (const tool of tools) {
      expect(tool.inputSchema).toHaveProperty('properties');
      expect(Object.keys(tool.description)).toEqual(['en', 'es']);
    }
  });

  it('pins the shape callers rely on', () => {
    expect(
      tools.map(({ name, readOnly, clientOnly, inputSchema }) => [
        name,
        readOnly,
        clientOnly,
        'required' in inputSchema ? inputSchema.required : [],
      ]),
    ).toEqual([
      ['get_faq', true, false, ['query']],
      ['get_pricing', true, false, []],
      ['estimate_project', true, false, ['answers']],
      ['check_availability', true, false, []],
      ['book_meeting', false, false, ['slot', 'name', 'email', 'topic']],
      ['navigate', true, true, ['page']],
      ['list_pages', true, false, []],
      ['get_page', true, false, ['page']],
      ['search_site', true, false, ['query']],
      ['open_contact_form', true, true, ['message']],
    ]);
  });

  it('leaves the booking tools out while the booking flag is off', () => {
    expect(manifest(OFF).tools.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'navigate',
      'list_pages',
      'get_page',
      'search_site',
      'open_contact_form',
    ]);
  });

  it('leaves the estimate out while the calculator is dark', () => {
    expect(
      manifest(flags(true, false)).tools.map((tool) => tool.name),
    ).not.toContain('estimate_project');
  });

  it('does not expose server-only fields', () => {
    const text = JSON.stringify(manifest(ON));
    expect(text).not.toMatch(
      /turnstile|consentAt|bearer|"website"|attribution/i,
    );
  });
});
