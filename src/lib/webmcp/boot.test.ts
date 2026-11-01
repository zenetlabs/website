import { describe, expect, it, vi } from 'vitest';
import {
  type BootDeps,
  findModelContext,
  scheduleWebMcp,
} from '@/lib/webmcp/boot';

function context() {
  return { registerTool: vi.fn() };
}

describe('findModelContext', () => {
  it('prefers document over navigator', () => {
    const doc = { modelContext: context() };
    const nav = { modelContext: context() };
    expect(findModelContext(doc, nav)).toBe(doc.modelContext);
  });

  it('falls back to navigator for the older trial', () => {
    const nav = { modelContext: context() };
    expect(findModelContext({}, nav)).toBe(nav.modelContext);
  });

  it.each([
    ['absent', {}],
    ['null', { modelContext: null }],
    ['an empty object', { modelContext: {} }],
    ['a non-function registerTool', { modelContext: { registerTool: 1 } }],
    ['a string', { modelContext: 'x' }],
  ])('returns null when modelContext is %s', (_label, host) => {
    expect(findModelContext(host, host)).toBeNull();
  });
});

function boot(overrides: Partial<BootDeps> = {}) {
  const loaded = vi.fn((run: () => void) => run());
  const idle = vi.fn((run: () => void) => run());
  const load = vi.fn(() => Promise.resolve());
  const deps: BootDeps = {
    doc: { modelContext: context() },
    nav: {},
    loaded,
    idle,
    load,
    ...overrides,
  };
  return { deps, loaded, idle, load };
}

describe('scheduleWebMcp', () => {
  it('does nothing without the API: no waiting, no load', () => {
    const { deps, loaded, idle, load } = boot({ doc: {}, nav: {} });
    scheduleWebMcp(deps);
    expect(loaded).not.toHaveBeenCalled();
    expect(idle).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it('waits for the load event, then idle, then loads once with the context', () => {
    const order: string[] = [];
    const doc = { modelContext: context() };
    const { deps, load } = boot({
      doc,
      loaded: (run) => {
        order.push('loaded');
        run();
      },
      idle: (run) => {
        order.push('idle');
        run();
      },
    });
    scheduleWebMcp(deps);
    expect(order).toEqual(['loaded', 'idle']);
    expect(load).toHaveBeenCalledExactlyOnceWith(doc.modelContext);
  });

  it('does not load before the page has loaded', () => {
    const pending: Array<() => void> = [];
    const { deps, load } = boot({ loaded: (run) => void pending.push(run) });
    scheduleWebMcp(deps);
    expect(load).not.toHaveBeenCalled();
    pending[0]?.();
    expect(load).toHaveBeenCalledOnce();
  });

  it('swallows a failed load (Vitest fails the run on an unhandled rejection)', async () => {
    const load = vi.fn(() => Promise.reject(new Error('chunk gone')));
    const { deps } = boot({ load });
    scheduleWebMcp(deps);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(load).toHaveBeenCalledOnce();
  });
});
