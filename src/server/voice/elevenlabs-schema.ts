import { isRecord } from '@/lib/is-record';

type Leaf = {
  type: 'string' | 'number' | 'integer' | 'boolean';
  description: string;
  enum?: string[];
};

type ElevenLabsProperty =
  | Leaf
  | { type: 'array'; description: string; items: ElevenLabsProperty }
  | ElevenLabsObject;

export type ElevenLabsObject = {
  type: 'object';
  description: string;
  required?: string[];
  properties: Record<string, ElevenLabsProperty>;
};

// Keywords the server still enforces with zod; ElevenLabs has no use for them.
const DROPPED = new Set([
  '$schema',
  'additionalProperties',
  'default',
  'format',
  'pattern',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
]);
const KEPT = new Set([
  'type',
  'const',
  'description',
  'enum',
  'properties',
  'required',
  'items',
]);

function isLeafType(type: string): type is Leaf['type'] {
  return (
    type === 'string' ||
    type === 'number' ||
    type === 'integer' ||
    type === 'boolean'
  );
}

function fail(path: string, reason: string): never {
  throw new Error(`ElevenLabs schema: ${reason} at ${path || '(root)'}`);
}

function stringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return fail(path, 'expected a list');
  return value.map((entry) =>
    typeof entry === 'string' ? entry : fail(path, 'a non-string entry'),
  );
}

function convert(
  node: unknown,
  path: string,
  inherited: string | undefined,
): ElevenLabsProperty {
  if (!isRecord(node)) return fail(path, 'expected a schema object');
  for (const key of Object.keys(node)) {
    if (!KEPT.has(key) && !DROPPED.has(key)) {
      fail(path, `unsupported keyword "${key}"`);
    }
  }
  const { type } = node;
  if (typeof type !== 'string') return fail(path, 'a missing or union type');
  // `z.literal(true)` is how a schema demands a yes. ElevenLabs has no constant
  // for the model to fill in, so it is a boolean the server then insists is true.
  if (
    node.const !== undefined &&
    !(type === 'boolean' && node.const === true)
  ) {
    return fail(path, 'unsupported keyword "const"');
  }
  const own = typeof node.description === 'string' ? node.description : '';
  const description = own === '' ? (inherited ?? '') : own;

  if (type === 'object') {
    if (!isRecord(node.properties))
      return fail(path, 'an object without properties');
    const properties: Record<string, ElevenLabsProperty> = {};
    for (const [name, child] of Object.entries(node.properties)) {
      properties[name] = convert(
        child,
        path ? `${path}.${name}` : name,
        undefined,
      );
    }
    const required =
      node.required === undefined ? [] : stringList(node.required, path);
    return {
      type,
      description,
      ...(required.length > 0 ? { required } : {}),
      properties,
    };
  }
  if (type === 'array') {
    if (description === '') return fail(path, 'a leaf without a description');
    return {
      type,
      description,
      items: convert(node.items, `${path}[]`, description),
    };
  }
  if (!isLeafType(type)) return fail(path, `unsupported type "${type}"`);
  if (description === '') return fail(path, 'a leaf without a description');
  const values = node.enum === undefined ? [] : stringList(node.enum, path);
  return {
    type,
    description,
    ...(values.length > 0 ? { enum: values } : {}),
  };
}

// Maps a zod JSON Schema (io: 'input') to ElevenLabs' tool-parameter dialect.
// It throws on anything it cannot express, so a registry change fails a test
// instead of breaking an agent. The fields in `omit` are filled by the site.
export function toElevenLabsSchema(
  jsonSchema: unknown,
  { omit, description }: { omit: readonly string[]; description: string },
): ElevenLabsObject {
  if (!isRecord(jsonSchema) || !isRecord(jsonSchema.properties)) {
    return fail('', 'expected an object schema');
  }
  const omitted = new Set(omit);
  const properties = Object.fromEntries(
    Object.entries(jsonSchema.properties).filter(
      ([name]) => !omitted.has(name),
    ),
  );
  const required =
    jsonSchema.required === undefined
      ? []
      : stringList(jsonSchema.required, '').filter(
          (name) => !omitted.has(name),
        );
  const converted = convert(
    { ...jsonSchema, properties, required, description },
    '',
    undefined,
  );
  if (converted.type !== 'object') return fail('', 'expected an object schema');
  return converted;
}
