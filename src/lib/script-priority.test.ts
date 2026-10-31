import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferredEntryLoader, withDeferredEntry } from '@/lib/script-priority';

interface FakeElement {
  getAttribute(name: string): string | null;
  remove(): void;
  replace(content: string, options: { html: boolean }): void;
}
interface FakeHandlers {
  element(el: FakeElement): void;
}

const instances: FakeRewriter[] = [];

class FakeRewriter {
  handlers = new Map<string, FakeHandlers>();
  constructor() {
    instances.push(this);
  }
  on(selector: string, handlers: FakeHandlers) {
    this.handlers.set(selector, handlers);
    return this;
  }
  transform(response: Response) {
    return response;
  }
}

function fakeElement(attributes: Record<string, string>) {
  return {
    getAttribute: (name: string) => attributes[name] ?? null,
    remove: vi.fn(),
    replace: vi.fn(),
  };
}

describe('deferredEntryLoader', () => {
  it('imports the entry and re-adds the preloads after the first paint', () => {
    const loader = deferredEntryLoader('/assets/index.js', [
      '/assets/index.js',
      '/assets/chunk.js',
    ]);
    expect(loader).toContain("getEntriesByName('first-contentful-paint')");
    expect(loader.startsWith('{const u=')).toBe(true);
    expect(loader.endsWith('}')).toBe(true);
    expect(loader).not.toContain('=>{})()');
    expect(loader).toContain('if(document.hidden||');
    expect(loader).toContain('setTimeout(go,3000)');
    expect(loader).toContain(
      '{"entry":"/assets/index.js","preloads":["/assets/index.js","/assets/chunk.js"]}',
    );
    expect(loader).toContain("l.rel='modulepreload'");
    expect(loader).toContain('import(u.entry)');
  });

  it('cannot close its script element', () => {
    expect(deferredEntryLoader('/a.js</script><b>', [])).not.toContain('<');
  });
});

describe('withDeferredEntry', () => {
  beforeEach(() => {
    instances.length = 0;
    vi.stubGlobal('HTMLRewriter', FakeRewriter);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('swaps the preloads and entry script for the deferred loader', () => {
    const response = new Response('<html></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    withDeferredEntry(response);
    expect(instances).toHaveLength(1);
    const handlers = instances[0]?.handlers;
    const preload = fakeElement({ href: '/assets/chunk.js' });
    handlers?.get('link[rel="modulepreload"]')?.element(preload);
    expect(preload.remove).toHaveBeenCalled();

    const script = fakeElement({ src: '/assets/index.js' });
    handlers?.get('script[type="module"][src]')?.element(script);
    expect(script.replace).toHaveBeenCalledWith(
      `<script>${deferredEntryLoader('/assets/index.js', ['/assets/chunk.js'])}</script>`,
      { html: true },
    );
  });

  it('leaves preloads that come after the entry script in place', () => {
    const response = new Response('<html></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    withDeferredEntry(response);
    const handlers = instances[0]?.handlers;
    const early = fakeElement({ href: '/assets/early.js' });
    const script = fakeElement({ src: '/assets/index.js' });
    const late = fakeElement({ href: '/assets/late.js' });
    handlers?.get('link[rel="modulepreload"]')?.element(early);
    handlers?.get('script[type="module"][src]')?.element(script);
    handlers?.get('link[rel="modulepreload"]')?.element(late);
    expect(early.remove).toHaveBeenCalled();
    expect(late.remove).not.toHaveBeenCalled();
    expect(script.replace).toHaveBeenCalledWith(
      `<script>${deferredEntryLoader('/assets/index.js', ['/assets/early.js'])}</script>`,
      { html: true },
    );
  });

  it.each([
    {
      name: 'JSON',
      headers: new Headers({ 'content-type': 'application/json' }),
    },
    { name: 'no content type', headers: new Headers() },
  ])('passes $name responses through', ({ headers }) => {
    const response = new Response(null, { headers });
    expect(withDeferredEntry(response)).toBe(response);
    expect(instances).toHaveLength(0);
  });
});
