import type { WebMcpCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import type { ToolEnvelope } from '@/lib/webmcp/confirmation';
import { WEBMCP_TOOL_NAMES, type WebMcpToolName } from '@/lib/webmcp/names';

type ToolAnnotations = {
  readOnlyHint?: boolean;
  consequentialHint?: boolean;
};

export type WebMcpTool = {
  name: WebMcpToolName;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: ToolAnnotations;
  execute: (input: unknown, options?: unknown) => Promise<ToolEnvelope>;
};

export type ManifestEntry = {
  name: string;
  description: Record<Locale, string>;
  inputSchema: Record<string, unknown>;
};

export type ToolManifest = { version: 1; tools: ManifestEntry[] };

export type Executors = Record<WebMcpToolName, WebMcpTool['execute']>;

export const ANNOTATIONS: Record<WebMcpToolName, ToolAnnotations> = {
  get_faq: { readOnlyHint: true },
  get_pricing: { readOnlyHint: true },
  estimate_project: { readOnlyHint: true },
  check_availability: { readOnlyHint: true },
  book_meeting: { readOnlyHint: false, consequentialHint: true },
  navigate: { readOnlyHint: false },
};

// The visitor supplies these in the confirmation dialog, never the agent.
const OPTIONAL: Partial<Record<WebMcpToolName, readonly string[]>> = {
  book_meeting: ['name', 'email', 'company'],
};

const REPLACES_LAST_SENTENCE: ReadonlySet<WebMcpToolName> = new Set([
  'book_meeting',
]);

function isEntry(value: unknown): value is ManifestEntry {
  if (!isRecord(value) || typeof value.name !== 'string') return false;
  const { description, inputSchema } = value;
  return (
    isRecord(description) &&
    typeof description.en === 'string' &&
    typeof description.es === 'string' &&
    isRecord(inputSchema) &&
    inputSchema.type === 'object'
  );
}

export function isToolManifest(value: unknown): value is ToolManifest {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.tools) &&
    value.tools.every(isEntry)
  );
}

function toolName(name: string): WebMcpToolName | undefined {
  return WEBMCP_TOOL_NAMES.find((candidate) => candidate === name);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

// The locale is the page's: it picks the market, so an agent cannot override it.
function inputSchemaFor(
  name: WebMcpToolName,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const optional = new Set(OPTIONAL[name]);
  const { properties, required, ...rest } = schema;
  const kept = isRecord(properties)
    ? Object.fromEntries(
        Object.entries(properties).filter(([key]) => key !== 'locale'),
      )
    : {};
  return {
    ...rest,
    properties: kept,
    required: strings(required).filter(
      (key) => key !== 'locale' && !optional.has(key),
    ),
  };
}

// The server sentence tells a caller to book once the visitor has confirmed the
// details; here the visitor types them in the dialog, so the note replaces it.
function withoutLastSentence(text: string): string {
  const cut = text.lastIndexOf('. ', text.length - 2);
  return cut === -1 ? text : text.slice(0, cut + 1);
}

function descriptionFor(
  name: WebMcpToolName,
  served: string,
  note: string | undefined,
): string {
  if (note === undefined) return served;
  const base = REPLACES_LAST_SENTENCE.has(name)
    ? withoutLastSentence(served)
    : served;
  return `${base} ${note}`;
}

function toWebMcpTool(
  entry: ManifestEntry,
  name: WebMcpToolName,
  locale: Locale,
  copy: WebMcpCopy,
  execute: WebMcpTool['execute'],
): WebMcpTool {
  return {
    name,
    title: copy.titles[name],
    description: descriptionFor(
      name,
      entry.description[locale],
      copy.notes[name],
    ),
    inputSchema: inputSchemaFor(name, entry.inputSchema),
    annotations: ANNOTATIONS[name],
    execute,
  };
}

export function toWebMcpTools(
  manifest: ToolManifest,
  locale: Locale,
  copy: WebMcpCopy,
  executors: Executors,
): WebMcpTool[] {
  return manifest.tools.flatMap((entry) => {
    const name = toolName(entry.name);
    return name === undefined
      ? []
      : [toWebMcpTool(entry, name, locale, copy, executors[name])];
  });
}
