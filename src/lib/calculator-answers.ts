export const PROJECT_TYPES = ['automation', 'agent', 'web'] as const;
export const TOOL_IDS = [
  'erp',
  'shop',
  'crm',
  'messaging',
  'sheets',
  'documents',
  'custom',
  'other',
] as const;
export const VOLUMES = ['low', 'medium', 'high', 'very-high'] as const;
export const URGENCIES = ['flexible', 'standard', 'urgent'] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type ToolId = (typeof TOOL_IDS)[number];
export type Volume = (typeof VOLUMES)[number];
export type Urgency = (typeof URGENCIES)[number];

export type CalculatorAnswers = {
  type: ProjectType;
  tools: readonly ToolId[];
  volume: Volume;
  agent: boolean;
  web: boolean;
  urgency: Urgency;
  maintenance: boolean;
};

export type CalculatorSearch = {
  type?: ProjectType;
  volume?: Volume;
  agent?: true;
  web?: true;
  urgency?: Urgency;
  maintenance?: boolean;
} & { [K in ToolId]?: true };

function oneOf<T extends string>(
  options: readonly T[],
  value: unknown,
): T | undefined {
  return options.find((option) => option === value);
}

function flag(value: unknown): true | undefined {
  return value === true || value === 'true' ? true : undefined;
}

function choice(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export function calculatorSearch(
  raw: Record<string, unknown>,
): CalculatorSearch {
  return {
    type: oneOf(PROJECT_TYPES, raw.type),
    erp: flag(raw.erp),
    shop: flag(raw.shop),
    crm: flag(raw.crm),
    messaging: flag(raw.messaging),
    sheets: flag(raw.sheets),
    documents: flag(raw.documents),
    custom: flag(raw.custom),
    other: flag(raw.other),
    volume: oneOf(VOLUMES, raw.volume),
    agent: flag(raw.agent),
    web: flag(raw.web),
    urgency: oneOf(URGENCIES, raw.urgency),
    maintenance: choice(raw.maintenance),
  };
}

export function answersFromSearch(
  search: CalculatorSearch,
): CalculatorAnswers | null {
  const { type, volume, urgency, maintenance } = search;
  if (
    type === undefined ||
    volume === undefined ||
    urgency === undefined ||
    maintenance === undefined
  ) {
    return null;
  }
  return {
    type,
    tools: TOOL_IDS.filter((id) => search[id] === true),
    volume,
    agent: search.agent === true,
    web: search.web === true,
    urgency,
    maintenance,
  };
}

function toolFlag(answers: CalculatorAnswers, id: ToolId): true | undefined {
  return answers.tools.includes(id) ? true : undefined;
}

export function searchFromAnswers(
  answers: CalculatorAnswers,
): CalculatorSearch {
  return {
    type: answers.type,
    erp: toolFlag(answers, 'erp'),
    shop: toolFlag(answers, 'shop'),
    crm: toolFlag(answers, 'crm'),
    messaging: toolFlag(answers, 'messaging'),
    sheets: toolFlag(answers, 'sheets'),
    documents: toolFlag(answers, 'documents'),
    custom: toolFlag(answers, 'custom'),
    other: toolFlag(answers, 'other'),
    volume: answers.volume,
    agent: answers.agent ? true : undefined,
    web: answers.web ? true : undefined,
    urgency: answers.urgency,
    maintenance: answers.maintenance,
  };
}

export function answersQuery(answers: CalculatorAnswers): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchFromAnswers(answers))) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export function answersFromForm(data: FormData): CalculatorAnswers | null {
  return answersFromSearch(calculatorSearch(Object.fromEntries(data)));
}
