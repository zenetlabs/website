import type { BrowserContext, Page } from '@playwright/test';

export type StubTool = {
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
};

export type WebMcpProbe = {
  names: () => string[];
  describe: (name: string) => StubTool | null;
  execute: (name: string, input: unknown) => Promise<unknown>;
  abort: () => void;
};

declare global {
  interface Window {
    __webmcp?: WebMcpProbe;
  }
}

export type StubOptions = {
  host: 'document' | 'navigator';
  rejectRegister: boolean;
};

// Runs in the page before any script. Mirrors the 2026 spec: registerTool is
// async and rejects a duplicate; execute gets { signal }; results are JSON.
function install(options: StubOptions) {
  type Registered = {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: Record<string, unknown>;
    execute: (
      input: unknown,
      client: { signal: AbortSignal },
    ) => Promise<unknown>;
  };
  function isRegistered(value: unknown): value is Registered {
    return (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      typeof value.name === 'string' &&
      'execute' in value &&
      typeof value.execute === 'function'
    );
  }
  const tools = new Map<string, Registered>();
  const inFlight = new Set<AbortController>();
  const context = {
    registerTool(tool: unknown) {
      if (options.rejectRegister) {
        return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      }
      if (!isRegistered(tool)) {
        return Promise.reject(new TypeError('not a tool'));
      }
      if (tools.has(tool.name)) {
        return Promise.reject(
          new DOMException('duplicate', 'InvalidStateError'),
        );
      }
      tools.set(tool.name, tool);
      return options.host === 'document'
        ? Promise.resolve(undefined)
        : undefined;
    },
  };
  Object.defineProperty(
    options.host === 'document' ? Document.prototype : Navigator.prototype,
    'modelContext',
    { configurable: true, get: () => context },
  );
  window.__webmcp = {
    names: () => [...tools.keys()],
    describe: (name) => {
      const tool = tools.get(name);
      if (!tool) return null;
      return structuredClone({
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      });
    },
    execute: async (name, input) => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`no tool ${name}`);
      const controller = new AbortController();
      inFlight.add(controller);
      try {
        const result = await tool.execute(input, { signal: controller.signal });
        return structuredClone(result);
      } finally {
        inFlight.delete(controller);
      }
    },
    abort: () => {
      for (const controller of inFlight) controller.abort();
    },
  };
}

export async function installModelContext(
  target: Page | BrowserContext,
  options: Partial<StubOptions> = {},
): Promise<void> {
  await target.addInitScript(install, {
    host: options.host ?? 'document',
    rejectRegister: options.rejectRegister ?? false,
  });
}

// Starts a tool call and returns at once. The rejection is marked handled here
// so a call abandoned by a failing test cannot surface as an unhandled rejection.
export function startCall(
  page: Page,
  name: string,
  input: unknown,
): Promise<unknown> {
  const call = page.evaluate(
    ([toolName, toolInput]) => {
      if (typeof toolName !== 'string' || !window.__webmcp) {
        throw new Error('stub missing');
      }
      return window.__webmcp.execute(toolName, toolInput);
    },
    [name, input],
  );
  call.catch(() => undefined);
  return call;
}
