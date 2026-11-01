import { noop } from '@/lib/time';
import type { WebMcpTool } from '@/lib/webmcp/tools';

export type ModelContextLike = {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => unknown;
};

function isModelContext(value: unknown): value is ModelContextLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'registerTool' in value &&
    typeof value.registerTool === 'function'
  );
}

function contextOf(host: object): ModelContextLike | null {
  if (!('modelContext' in host)) return null;
  return isModelContext(host.modelContext) ? host.modelContext : null;
}

// The spec puts it on document; the 2026 developer trial and polyfills used navigator.
export function findModelContext(
  doc: object,
  nav: object,
): ModelContextLike | null {
  return contextOf(doc) ?? contextOf(nav);
}

export type BootDeps = {
  doc: object;
  nav: object;
  loaded: (run: () => void) => void;
  idle: (run: () => void) => void;
  load: (context: ModelContextLike) => Promise<void>;
};

function afterLoad(run: () => void): void {
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 10_000 });
    return;
  }
  window.setTimeout(run, 2000);
}

function defaults(): BootDeps {
  return {
    doc: document,
    nav: navigator,
    loaded: afterLoad,
    idle: whenIdle,
    load: (context) =>
      import('@/lib/webmcp/register').then((m) => m.registerWebMcp(context)),
  };
}

// Loaded by src/client.tsx only where the browser has a modelContext.
export function scheduleWebMcp(deps: BootDeps = defaults()): void {
  const context = findModelContext(deps.doc, deps.nav);
  if (context === null) return;
  deps.loaded(() => {
    deps.idle(() => {
      deps.load(context).then(noop, noop);
    });
  });
}
