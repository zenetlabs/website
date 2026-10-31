import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferredEntryLoader, withDeferredEntry } from '@/lib/deferred-entry';

interface FakeElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  remove(): void;
  replace(content: string, options: { html: boolean }): void;
}
interface FakeHandlers {
  element(el: FakeElement): void;
}
interface FakeEnd {
  append(content: string, options: { html: boolean }): void;
}
interface FakeDocumentHandlers {
  end(end: FakeEnd): void;
}

const instances: FakeRewriter[] = [];

class FakeRewriter {
  handlers = new Map<string, FakeHandlers>();
  documentHandlers: FakeDocumentHandlers | undefined;
  constructor() {
    instances.push(this);
  }
  on(selector: string, handlers: FakeHandlers) {
    this.handlers.set(selector, handlers);
    return this;
  }
  onDocument(handlers: FakeDocumentHandlers) {
    this.documentHandlers = handlers;
    return this;
  }
  transform(response: Response) {
    return response;
  }
}

const PRELOAD = 'link[rel="modulepreload"]';
const MODULE = 'script[type="module"][src]';

function fakeElement(attributes: Record<string, string>) {
  return {
    getAttribute: (name: string) => attributes[name] ?? null,
    setAttribute: vi.fn(),
    remove: vi.fn(),
    replace: vi.fn(),
  };
}

function rewrite() {
  withDeferredEntry(
    new Response('<html></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
  );
  const rewriter = instances[0];
  const preload = (href: string) => {
    const el = fakeElement({ href });
    rewriter?.handlers.get(PRELOAD)?.element(el);
    return el;
  };
  const module = (src: string) => {
    const el = fakeElement({ src });
    rewriter?.handlers.get(MODULE)?.element(el);
    return el;
  };
  const end = () => {
    const append = vi.fn();
    rewriter?.documentHandlers?.end({ append });
    return append;
  };
  return { preload, module, end };
}

describe('deferredEntryLoader', () => {
  it('imports the entry and re-adds the preloads after the first paint', () => {
    const loader = deferredEntryLoader('/assets/index.js', [
      '/assets/index.js',
      '/assets/chunk.js',
    ]);
    expect(loader).toContain(
      '{"entry":"/assets/index.js","preloads":["/assets/index.js","/assets/chunk.js"]}',
    );
    expect(loader).toContain("getEntriesByName('first-contentful-paint')");
    expect(loader.startsWith('{const u=')).toBe(true);
    expect(loader.endsWith('}')).toBe(true);
    expect(loader).not.toContain('=>{})()');
    expect(loader).toContain('if(document.hidden||');
    expect(loader).toContain('setTimeout(go,3000)');
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
    const { preload, module, end } = rewrite();
    const chunk = preload('/assets/chunk.js');
    const entry = module('/assets/index.js');
    expect(chunk.remove).toHaveBeenCalled();
    expect(entry.replace).toHaveBeenCalledWith(
      `<script>${deferredEntryLoader('/assets/index.js', ['/assets/chunk.js'])}</script>`,
      { html: true },
    );
    expect(end()).not.toHaveBeenCalled();
  });

  it('leaves preloads after the entry in place at low priority', () => {
    const { preload, module } = rewrite();
    const early = preload('/assets/early.js');
    const entry = module('/assets/index.js');
    const late = preload('/assets/late.js');
    expect(early.remove).toHaveBeenCalled();
    expect(late.remove).not.toHaveBeenCalled();
    expect(late.setAttribute).toHaveBeenCalledWith('fetchpriority', 'low');
    expect(entry.replace).toHaveBeenCalledWith(
      `<script>${deferredEntryLoader('/assets/index.js', ['/assets/early.js'])}</script>`,
      { html: true },
    );
  });

  it('treats only the first module script as the entry', () => {
    const { preload, module } = rewrite();
    preload('/assets/chunk.js');
    const entry = module('/assets/index.js');
    const other = module('/assets/other.js');
    expect(entry.replace).toHaveBeenCalledOnce();
    expect(other.replace).not.toHaveBeenCalled();
    expect(other.setAttribute).not.toHaveBeenCalled();
    expect(other.remove).not.toHaveBeenCalled();
  });

  it('restores the preloads when the page has no entry script', () => {
    const { preload, end } = rewrite();
    preload('/assets/a.js');
    preload('/assets/"b".js');
    expect(end()).toHaveBeenCalledWith(
      '<link rel="modulepreload" href="/assets/a.js" fetchpriority="low">' +
        '<link rel="modulepreload" href="/assets/&quot;b&quot;.js" fetchpriority="low">',
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
