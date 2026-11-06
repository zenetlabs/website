import { dateKey, zonedParts } from '@/lib/slots';
import { fold, hasWord, WEEKDAYS, wordPattern } from '@/server/chat/text';

// Small, deterministic reads of the visitor's message, made before the model
// runs. They decide what the server enforces, never what the model may say.

const INJECTION = [
  /\b(?:ignore|disregard|forget)\b.*\b(?:instructions?|rules|prompt)\b/,
  /\bsystem prompt\b|\bdeveloper mode\b|\byou are now\b|\bjailbreak\b|\bpretend (?:to be|you)\b/,
  /\b(?:ignora|olvida|olvidate de)\b.*\b(?:instrucciones|reglas)\b/,
  /\breglas internas\b|\bmodo (?:desarrollador|dios)\b|\bahora eres\b|\bhazte pasar\b|\bprompt del sistema\b/,
  /\badmin(?:istrator|istrador)?\b.*\b(?:approved|authori[sz]ed|aprobado|autorizado)\b/,
];

// Words that put a message inside what the assistant is for. Weather, poems,
// recipes or general knowledge match none of them.
const ON_TOPIC = new RegExp(
  String.raw`\b(?:` +
    [
      'zenet',
      'prices?',
      'pricing',
      'costs?',
      'rates?',
      'discount',
      'quote',
      'budget',
      'calls?',
      'book(?:ing)?',
      'meeting',
      'appointment',
      'availability',
      'office',
      'located',
      'based',
      'integrations?',
      'integrate',
      'connect',
      'automat[a-z]*',
      'agents?',
      'software',
      'apps?',
      'websites?',
      'seo',
      'training',
      'maintenance',
      'diagnostic',
      'projects?',
      'code',
      'data',
      'privacy',
      'tools?',
      'erp',
      'crm',
      'whatsapp',
      'invoices?',
      'shopify',
      'xero',
      'hubspot',
      'holded',
      'prestashop',
      'woocommerce',
      'sap',
      'verifactu',
      'founder',
      'precios?',
      'cuesta',
      'cuanto',
      'tarifa',
      'descuento',
      'presupuesto',
      'llamada',
      'reserv[a-z]*',
      'reunion',
      'cita',
      'disponib[a-z]*',
      'oficinas?',
      'integracion(?:es)?',
      'integrar',
      'conect[a-z]*',
      'agentes?',
      'formacion',
      'mantenimiento',
      'diagnostico',
      'proyectos?',
      'codigo',
      'datos',
      'privacidad',
      'herramientas?',
      'facturas?',
      'trabajais',
      'haceis',
      'fundador',
    ].join('|') +
    String.raw`)\b`,
);

export type Intent = 'injection' | 'on-topic' | 'other';

export function messageIntent(message: string): Intent {
  const text = fold(message);
  if (INJECTION.some((pattern) => pattern.test(text))) return 'injection';
  return ON_TOPIC.test(text) ? 'on-topic' : 'other';
}

// The FAQ entries whose answer must not be paraphrased into its opposite.
export type GroundedFaq = 'ownership' | 'privacy' | 'models' | 'where';

const TOPICS: ReadonlyArray<[GroundedFaq, RegExp]> = [
  [
    'ownership',
    /\bwho owns\b|\bowns? the (?:code|data|software|ip)\b|\bownership\b|\bintellectual property\b|\bde quien (?:es|son|sera|seran)\b.*\b(?:codigo|datos|software)\b|\bpropiedad (?:del|de los|intelectual)\b|\bpropietari|\bduen[oa]s?\b/,
  ],
  [
    'privacy',
    /\bprivacy\b|\bgdpr\b|\bpdpa\b|\bdata protection\b|\bwhere\b.*\bdata\b.*\b(?:kept|stored|live|hosted)\b|\bprivacidad\b|\brgpd\b|\bproteccion de datos\b|\bdonde\b.*\b(?:se guardan|guardais|estan|alojais)\b.*\bdatos\b/,
  ],
  [
    'where',
    /\boffices?\b|\bheadquarters\b|\bwhere are you\b|\b(?:located|based) in\b|\boficinas?\b|\bsede\b|\bdonde (?:estais|teneis|esta)\b/,
  ],
  [
    'models',
    /\b(?:which|what) (?:ai |llm )?models?\b|\b(?:llms?|openai|chatgpt|gpt|claude|anthropic|gemini)\b|\bque modelos?\b|\bmodelos? de (?:ia|lenguaje)\b/,
  ],
];

// The FAQ entry a question is clearly about, or null.
export function faqTopic(message: string): GroundedFaq | null {
  const text = fold(message);
  return TOPICS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

// A request for a time, not any mention of calls or bookings: "book a call",
// "talk to someone", "me gustaría una llamada", "reservar una llamada",
// "huecos", "free slots", or a call asked for "next week". "Can your agent
// answer phone calls?" or "automate my appointment reminders" are not.
const CALL = `(?:a |an |one )?(?:quick |short |free )?(?:call|meeting|chat|appointment|demo)`;
const LLAMADA = `(?:una |un )?(?:llamada|reunion|cita|videollamada)`;
const BOOKING = [
  new RegExp(
    String.raw`\b(?:book|schedule|arrange|set up|organi[sz]e)\s+${CALL}\b`,
  ),
  new RegExp(
    String.raw`\b(?:i'?d like|i would like|i want|can we have|could we have|let'?s have)\s+${CALL}\b`,
  ),
  /\b(?:talk|speak) (?:to|with) (?:someone|a person|a human|somebody|the founder)\b/,
  /\b(?:free|available|open) (?:slots?|times?)\b/,
  new RegExp(
    String.raw`\b(?:quiero|quisiera|me gustaria|necesito)\s+${LLAMADA}\b`,
  ),
  new RegExp(
    String.raw`\b(?:reservar|agendar|programar|concertar)\s+${LLAMADA}\b`,
  ),
  /\bhablar con (?:alguien|una persona|el fundador)\b/,
  /\bhuecos?\b/,
  /\b(?:call|meeting|llamada|reunion)\b.*\b(?:next week|semana que viene|proxima semana)\b/,
];

export function bookingIntent(message: string): boolean {
  const text = fold(message).replace(/[’‘]/g, "'");
  return BOOKING.some((pattern) => pattern.test(text));
}

const WEEKDAY = new RegExp(`\\b(${Object.keys(WEEKDAYS).join('|')})\\b`);
const NEXT_WEEK =
  /\bnext week\b|\b(?:la )?semana que viene\b|\b(?:la )?proxima semana\b/;
const THIS_WEEK = /\bthis week\b|\besta semana\b/;
const TOMORROW = /\btomorrow\b|(?<!\bla |\bpasado )\bmanana\b/;
const TODAY = /\btoday\b|\bhoy\b/;

const DAY_MS = 86_400_000;

export type DayRange = { from: string; to: string };

// The days the visitor names, in their own zone: "next week", "this week",
// "tomorrow", a weekday (its next occurrence). Null when they name none.
export function requestedDays(
  message: string,
  now: number,
  zone: string,
): DayRange | null {
  const text = fold(message);
  const today = zonedParts(now, zone);
  const base = Date.UTC(today.year, today.month - 1, today.day);
  const day = (offset: number) => {
    const date = new Date(base + offset * DAY_MS);
    return dateKey({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    });
  };
  const span = (from: number, to: number) => ({ from: day(from), to: day(to) });
  const nextWeek = NEXT_WEEK.test(text);
  const weekday = WEEKDAY.exec(text)?.[1];
  if (weekday !== undefined) {
    const target = WEEKDAYS[weekday] ?? today.weekday;
    const offset = nextWeek
      ? 8 - today.weekday + target - 1
      : (target - today.weekday + 7) % 7 || 7;
    return span(offset, offset);
  }
  if (nextWeek) return span(8 - today.weekday, 14 - today.weekday);
  if (THIS_WEEK.test(text)) return span(0, 7 - today.weekday);
  if (TOMORROW.test(text)) return span(1, 1);
  if (TODAY.test(text)) return span(0, 0);
  return null;
}

// Business software a visitor may ask about: the folded name that matches and
// the name the reply uses. Longer names first, so "SAP Business One" wins over
// "SAP".
const PRODUCTS: ReadonlyArray<readonly [string, string]> = [
  ['sap business one', 'SAP Business One'],
  ['dynamics 365', 'Dynamics 365'],
  ['sap', 'SAP'],
  ['odoo', 'Odoo'],
  ['sage', 'Sage'],
  ['netsuite', 'NetSuite'],
  ['salesforce', 'Salesforce'],
  ['zoho', 'Zoho'],
  ['quickbooks', 'QuickBooks'],
  ['navision', 'Navision'],
  ['magento', 'Magento'],
  ['bigcommerce', 'BigCommerce'],
  ['a3erp', 'a3ERP'],
  ['a3innuva', 'a3innuva'],
  ['contasol', 'ContaSOL'],
  ['factusol', 'FactuSOL'],
  ['holded', 'Holded'],
  ['prestashop', 'PrestaShop'],
  ['woocommerce', 'WooCommerce'],
  ['shopify', 'Shopify'],
  ['hubspot', 'HubSpot'],
  ['xero', 'Xero'],
  ['myob', 'MYOB'],
  ['pipedrive', 'Pipedrive'],
  ['airtable', 'Airtable'],
  ['stripe', 'Stripe'],
  ['lightspeed', 'Lightspeed'],
  ['mailchimp', 'Mailchimp'],
  ['klaviyo', 'Klaviyo'],
  ['zendesk', 'Zendesk'],
  ['freshdesk', 'Freshdesk'],
  ['intercom', 'Intercom'],
  ['teamleader', 'Teamleader'],
  ['squarespace', 'Squarespace'],
  ['wix', 'Wix'],
];

// The first product the message names that the official tool list does not,
// by its own display name (never the visitor's text): the reply must not claim
// it is supported. Names match as whole words, so "SAP" is not found inside
// "WhatsApp", and a longer name hides the shorter one it contains.
export function unlistedTool(message: string, list: string): string | null {
  let text = fold(message);
  const official = fold(list);
  for (const [key, name] of PRODUCTS) {
    if (!hasWord(text, key)) continue;
    if (!hasWord(official, key)) return name;
    text = text.replace(wordPattern(key, 'gu'), ' ');
  }
  return null;
}
