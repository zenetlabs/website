import { env } from 'cloudflare:workers';
import { SITE } from '@/lib/site';
import { readSecret } from '@/server/calendar-config';
import { methodNotAllowed } from '@/server/responses';
import { bookingDeps } from '@/server/tool-deps';
import {
  handleToolRequest,
  manifestResponse,
  type ToolHttpDeps,
} from '@/server/tools/http';
import { toolByName } from '@/server/tools/registry';

function toolDeps(): ToolHttpDeps {
  return {
    ...bookingDeps(),
    bearerSecret: () => readSecret(env.TOOLS_BEARER_SECRET),
    turnstileSecret: () => env.TURNSTILE_SECRET_KEY.get(),
    toolsLimiter: env.TOOLS_LIMITER,
    bookLimiter: env.BOOK_LIMITER,
    now: () => Date.now(),
  };
}

export function postTool(request: Request, name: string): Promise<Response> {
  return handleToolRequest(request, name, toolDeps());
}

export function getManifest(): Response {
  return manifestResponse(SITE);
}

// 404 for a tool that does not exist, 405 only for a real one.
export function wrongMethod(name: string): Response {
  const tool = toolByName(name);
  return tool === undefined || tool.clientOnly
    ? Response.json({ ok: false, error: 'unknown' }, { status: 404 })
    : methodNotAllowed('POST');
}
