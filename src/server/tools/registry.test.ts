import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { manifest, TOOLS, toolByName } from '@/server/tools/registry';

describe('TOOLS', () => {
  it('has six uniquely named snake_case tools', () => {
    expect(TOOLS.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'check_availability',
      'book_meeting',
      'navigate',
    ]);
    for (const tool of TOOLS) expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
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
    ).toEqual(['navigate']);
  });

  it('looks tools up by name', () => {
    expect(toolByName('get_faq')?.name).toBe('get_faq');
    expect(toolByName('nope')).toBeUndefined();
    expect(toolByName('__proto__')).toBeUndefined();
  });
});

describe('manifest', () => {
  const ON = { calculator: { published: false }, booking: { published: true } };
  const OFF = {
    calculator: { published: false },
    booking: { published: false },
  };
  const { tools } = manifest(ON);

  it('is versioned and lists the six tools with schemas', () => {
    expect(manifest(ON).version).toBe(1);
    expect(tools).toHaveLength(6);
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
    ]);
  });

  it('leaves the booking tools out while the booking flag is off', () => {
    expect(manifest(OFF).tools.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'navigate',
    ]);
  });

  it('does not expose server-only fields', () => {
    const text = JSON.stringify(manifest(ON));
    expect(text).not.toMatch(
      /turnstile|consentAt|bearer|"website"|attribution/i,
    );
  });
});
