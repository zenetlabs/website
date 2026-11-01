import { noop } from '@/lib/time';
import type { BookingDeps } from '@/server/booking';
import type { Issue } from '@/server/request';
import { errorName, jsonError, jsonOk } from '@/server/responses';
import type { ServerTool, ToolContext } from '@/server/tools/types';

export const MAX_BODY_BYTES = 16_384;

const STATUS = {
  unknown: 404,
  auth: 401,
  session: 401,
  origin: 403,
  unsupported: 415,
  rate: 429,
  'too-large': 413,
  invalid: 400,
  captcha: 403,
  unavailable: 503,
} as const;

type ToolError = keyof typeof STATUS;

export function reject(error: ToolError, issues?: Issue[]): Response {
  return jsonError(error, STATUS[error], issues ? { issues } : {});
}

export function succeed(result: unknown): Response {
  return jsonOk({ result });
}

export type Transport = Omit<ToolContext, 'deps'>;

// Runs a tool and wraps the outcome in the HTTP envelope. `afterRun` sees the
// result (undefined when the tool refused or threw) and runs under waitUntil,
// chained onto the work itself: a caller that gave up waiting, such as a webhook
// that timed out, cannot stop it.
export async function execute(
  tool: ServerTool,
  body: unknown,
  deps: BookingDeps,
  transport: Transport,
  afterRun?: (result: unknown) => Promise<void>,
): Promise<Response> {
  // Under waitUntil, like bookMeeting: a client disconnect must not cut the work.
  const work = tool.run(body, { ...transport, deps });
  deps.waitUntil(work.then(noop, noop));
  if (afterRun) {
    deps.waitUntil(
      work
        .then((outcome) => (outcome.ok ? outcome.result : undefined))
        .catch(() => undefined)
        .then(afterRun)
        .catch((error) => {
          console.error('tools: after-run failed', {
            tool: tool.name,
            code: errorName(error),
          });
        }),
    );
  }
  try {
    const outcome = await work;
    if (!outcome.ok) return reject('invalid', outcome.issues);
    return succeed(outcome.result);
  } catch (error) {
    console.error('tools: failed', {
      tool: tool.name,
      code: errorName(error),
    });
    return reject('unavailable');
  }
}
