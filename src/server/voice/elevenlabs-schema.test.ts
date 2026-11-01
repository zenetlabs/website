// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TOOLS } from '@/server/tools/registry';
import { toElevenLabsSchema } from '@/server/voice/elevenlabs-schema';

const OPTIONS = { omit: ['locale', 'timeZone'], description: 'Arguments.' };

function convert(schema: z.ZodType) {
  return toElevenLabsSchema(z.toJSONSchema(schema, { io: 'input' }), OPTIONS);
}

describe('toElevenLabsSchema', () => {
  it('maps every leaf type and keeps enums and required fields', () => {
    expect(
      convert(
        z.object({
          a: z.string().describe('A string'),
          b: z.number().describe('A number'),
          c: z.number().int().describe('An integer'),
          d: z.boolean().describe('A flag'),
          e: z.enum(['x', 'y']).describe('A choice'),
          f: z.string().optional().describe('Optional'),
        }),
      ),
    ).toEqual({
      type: 'object',
      description: 'Arguments.',
      required: ['a', 'b', 'c', 'd', 'e'],
      properties: {
        a: { type: 'string', description: 'A string' },
        b: { type: 'number', description: 'A number' },
        c: { type: 'integer', description: 'An integer' },
        d: { type: 'boolean', description: 'A flag' },
        e: { type: 'string', description: 'A choice', enum: ['x', 'y'] },
        f: { type: 'string', description: 'Optional' },
      },
    });
  });

  it('drops format, pattern, length and default, which the server still enforces', () => {
    const converted = convert(
      z.object({
        email: z.string().min(3).max(9).regex(/a/).describe('Email'),
        day: z.iso.date().default('2027-01-01').describe('Day'),
        at: z.iso.datetime().describe('Moment'),
      }),
    );
    const text = JSON.stringify(converted);
    expect(text).not.toMatch(/format|pattern|minLength|maxLength|default/);
    expect(Object.keys(converted.properties)).toEqual(['email', 'day', 'at']);
  });

  it('converts nested objects and arrays, inheriting the array description for items', () => {
    expect(
      convert(
        z.object({
          answers: z
            .object({
              tools: z.array(z.enum(['erp', 'crm'])).describe('Tools'),
              urgent: z.boolean().describe('Urgent'),
            })
            .describe('Answers'),
        }),
      ),
    ).toMatchObject({
      required: ['answers'],
      properties: {
        answers: {
          type: 'object',
          description: 'Answers',
          required: ['tools', 'urgent'],
          properties: {
            tools: {
              type: 'array',
              description: 'Tools',
              items: {
                type: 'string',
                description: 'Tools',
                enum: ['erp', 'crm'],
              },
            },
          },
        },
      },
    });
  });

  it('omits the fields the site fills in, even when required', () => {
    const converted = convert(
      z.object({
        locale: z.enum(['en', 'es']).describe('Locale'),
        timeZone: z.string().describe('Zone'),
        query: z.string().describe('Query'),
      }),
    );
    expect(Object.keys(converted.properties)).toEqual(['query']);
    expect(converted.required).toEqual(['query']);
  });

  it.each([
    [
      'a union',
      z.object({ v: z.union([z.string(), z.number()]).describe('d') }),
      'v',
    ],
    ['a nullable', z.object({ v: z.string().nullable().describe('d') }), 'v'],
    ['a literal', z.object({ v: z.literal('x').describe('d') }), 'v'],
    [
      'a record',
      z.object({ v: z.record(z.string(), z.string()).describe('d') }),
      'v',
    ],
  ])('throws on %s, naming the path', (_label, schema, path) => {
    expect(() => convert(schema)).toThrow(new RegExp(`at ${path}`));
  });

  it('maps z.literal(true) to a required boolean, and refuses any other constant', () => {
    expect(
      convert(
        z.object({
          confirmed: z.literal(true).describe('The visitor said yes'),
        }),
      ),
    ).toMatchObject({
      required: ['confirmed'],
      properties: {
        confirmed: { type: 'boolean', description: 'The visitor said yes' },
      },
    });
    expect(() =>
      convert(z.object({ v: z.literal(false).describe('d') })),
    ).toThrow('unsupported keyword "const"');
  });

  it('throws on a leaf without a description, with its path', () => {
    expect(() =>
      convert(
        z.object({ outer: z.object({ inner: z.string() }).describe('o') }),
      ),
    ).toThrow('a leaf without a description at outer.inner');
  });

  it('throws on a schema that is not an object', () => {
    expect(() => toElevenLabsSchema({ type: 'string' }, OPTIONS)).toThrow(
      'expected an object schema',
    );
  });

  it('converts every tool of the registry', () => {
    for (const tool of TOOLS) {
      expect(
        () =>
          toElevenLabsSchema(
            z.toJSONSchema(tool.input, { io: 'input' }),
            OPTIONS,
          ),
        tool.name,
      ).not.toThrow();
    }
  });
});
