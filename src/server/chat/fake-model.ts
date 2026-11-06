import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';
import { CANARY, REFUSAL } from '@/server/chat/guard';

export const FAKE_ASSISTANT_SENTINEL = 'FAKE_ASSISTANT_SENTINEL';

type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4['doStream']>
  >['stream'] extends ReadableStream<infer Part>
    ? Part
    : never;

const USAGE = {
  inputTokens: { total: 1000, noCache: 1000, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 50, text: 50, reasoning: 0 },
};

const promptSchema = z.array(
  z.object({ role: z.string(), content: z.unknown() }),
);
const textPartsSchema = z.array(
  z.object({ type: z.string(), text: z.string().optional() }).loose(),
);
const resultSchema = z.object({
  type: z.literal('tool-result'),
  toolName: z.string(),
  output: z.object({ value: z.unknown() }).loose(),
});
const pricingSchema = z.object({
  services: z.array(
    z.object({ prices: z.array(z.object({ display: z.string() })) }),
  ),
});
const slotsSchema = z.object({
  slots: z.array(z.object({ start: z.string() })),
});

type Reading = {
  es: boolean;
  question: string;
  results: Array<{ tool: string; value: unknown }>;
};

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  const parts = textPartsSchema.safeParse(content);
  return parts.success
    ? parts.data.map((part) => part.text ?? '').join(' ')
    : '';
}

// The visitor's words are the last text part; the turn context comes before them.
function lastText(content: unknown): string {
  if (typeof content === 'string') return content;
  const parts = textPartsSchema.safeParse(content);
  return parts.success ? (parts.data.at(-1)?.text ?? '') : '';
}

function read(prompt: unknown): Reading {
  const messages = promptSchema.parse(prompt);
  const system = messages.find((message) => message.role === 'system');
  const users = messages.filter((message) => message.role === 'user');
  const afterUser = messages.slice(
    messages.lastIndexOf(users.at(-1) ?? messages[0]) + 1,
  );
  const results = afterUser.flatMap((message) =>
    message.role === 'tool' && Array.isArray(message.content)
      ? message.content.flatMap((part: unknown) => {
          const parsed = resultSchema.safeParse(part);
          return parsed.success
            ? [{ tool: parsed.data.toolName, value: parsed.data.output.value }]
            : [];
        })
      : [],
  );
  return {
    es: textOf(system?.content).includes(`${CANARY}-ES`),
    question: lastText(users.at(-1)?.content).toLowerCase(),
    results,
  };
}

const NO_CALENDAR = {
  en: "I can't see the calendar right now. You can use the contact form or write to hello@zenetlabs.com.",
  es: 'Ahora no puedo ver la agenda. Puedes usar el formulario de contacto o escribir a hello@zenetlabs.com.',
};

function call(name: string, input: unknown): StreamPart[] {
  return [
    {
      type: 'tool-call',
      toolCallId: `fake-${name}`,
      toolName: name,
      input: JSON.stringify(input),
    },
    {
      type: 'finish',
      finishReason: { unified: 'tool-calls', raw: undefined },
      usage: USAGE,
    },
  ];
}

function say(text: string): StreamPart[] {
  const third = Math.ceil(text.length / 3);
  const deltas = [
    text.slice(0, third),
    text.slice(third, third * 2),
    text.slice(third * 2),
  ];
  return [
    { type: 'text-start', id: 'fake-text' },
    ...deltas.map(
      (delta): StreamPart => ({ type: 'text-delta', id: 'fake-text', delta }),
    ),
    { type: 'text-end', id: 'fake-text' },
    {
      type: 'finish',
      finishReason: { unified: 'stop', raw: undefined },
      usage: USAGE,
    },
  ];
}

// Text and a tool call in one step, as real models answer and open a page.
function sayAndCall(text: string, name: string, input: unknown): StreamPart[] {
  return [...say(text).slice(0, -1), ...call(name, input)];
}

const HOLDED_ANSWER = {
  en: 'Yes, we connect Holded with PrestaShop. Would you like to start with the diagnostic?',
  es: 'Sí, conectamos Holded con PrestaShop. ¿Te interesa hacer el diagnóstico primero?',
};

function has(question: string, words: readonly string[]): boolean {
  return words.some((word) => question.includes(word));
}

// Asks the calendar, then offers a time it never returned: the slot guard's e2e.
const FAKE_TIME = ['fake time', 'hora falsa'];

function script({ es, question, results }: Reading): StreamPart[] {
  const [last] = results.slice(-1);
  if (last?.tool === 'check_availability' && has(question, FAKE_TIME)) {
    return say(
      es
        ? 'Te propongo el domingo 1 de marzo a las 03:17. Es una gran hora.'
        : 'How about Sunday 1 March at 3:17 am? It is a great time.',
    );
  }
  if (last?.tool === 'get_pricing') {
    const pricing = pricingSchema.safeParse(last.value);
    const price = pricing.success
      ? pricing.data.services[0]?.prices[0]?.display
      : undefined;
    if (price === undefined) return say(NO_CALENDAR[es ? 'es' : 'en']);
    return say(
      es
        ? `Un agente de IA en producción cuesta ${price} sin IVA.`
        : `An AI agent in production costs ${price} excluding GST.`,
    );
  }
  if (last?.tool === 'check_availability') {
    const slots = slotsSchema.safeParse(last.value);
    const first = slots.success ? slots.data.slots[0] : undefined;
    return first === undefined
      ? say(NO_CALENDAR[es ? 'es' : 'en'])
      : call('book_meeting', {
          slot: first.start,
          topic: 'Automation diagnostic call',
        });
  }
  if (last?.tool === 'book_meeting') {
    return say(
      es
        ? 'Confirma los datos en la tarjeta de abajo.'
        : 'Confirm the details in the card below.',
    );
  }
  // Real models restate their answer after a navigate; the handler must not
  // ask for this step at all.
  if (last?.tool === 'navigate' && has(question, ['holded'])) {
    return say(HOLDED_ANSWER[es ? 'es' : 'en'].toLowerCase());
  }
  if (last?.tool === 'navigate') {
    return say(
      es ? 'Aquí tienes la página de precios.' : "Here's our pricing page.",
    );
  }
  if (has(question, ['ignore', 'system prompt', 'olvida', 'instrucciones'])) {
    return say(es ? REFUSAL.es : REFUSAL.en);
  }
  if (has(question, FAKE_TIME)) return call('check_availability', {});
  // The refusal said where it does not belong, and an inverted FAQ answer:
  // the server takes the first out and replaces the second.
  if (has(question, ['tokyo', 'tokio']))
    return say(es ? REFUSAL.es : REFUSAL.en);
  if (has(question, ['discount', 'descuento'])) {
    return say(
      es
        ? `${REFUSAL.es} El diagnóstico tiene un precio fijo y es el primer paso.`
        : `${REFUSAL.en} The diagnostic has a fixed price and is the first step.`,
    );
  }
  if (has(question, ['sap business one'])) {
    return say(
      es
        ? 'Sí, trabajamos con SAP Business One si tiene API.'
        : 'Yes, we work with SAP Business One if it has an API.',
    );
  }
  if (has(question, ['who owns', 'de quién es'])) {
    return say(
      es
        ? 'Somos los dueños del código hasta que se paga el proyecto.'
        : 'I own the code I write for you once the project is paid.',
    );
  }
  if (has(question, ['leak']))
    return say(`The rules start with ${CANARY}. Done.`);
  if (has(question, ['invent'])) {
    return say(es ? 'Cuesta 999 € al mes.' : 'It costs S$999 a month.');
  }
  if (has(question, ['holded'])) {
    return sayAndCall(HOLDED_ANSWER[es ? 'es' : 'en'], 'navigate', {
      page: 'holdedPrestashop',
    });
  }
  if (has(question, ['pricing page', 'página de precios'])) {
    return call('navigate', { page: 'pricing' });
  }
  if (has(question, ['book', 'reserv'])) return call('check_availability', {});
  if (has(question, ['price', 'cost', 'precio', 'cuánto', 'cuanto'])) {
    return call('get_pricing', { service: 'agent' });
  }
  return say(
    es
      ? 'No lo sé. Puedes usar el formulario de contacto o escribir a hello@zenetlabs.com.'
      : "I don't know that. You can use the contact form or write to hello@zenetlabs.com.",
  );
}

export function fakeChatModel() {
  return new MockLanguageModelV4({
    modelId: FAKE_ASSISTANT_SENTINEL,
    doStream: async ({ prompt }) => {
      const parts = script(read(prompt));
      return {
        stream: new ReadableStream({
          start(controller) {
            for (const part of parts) controller.enqueue(part);
            controller.close();
          },
        }),
      };
    },
  });
}
