import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withLowScriptPriority } from '@/lib/script-priority';

interface FakeElement {
  setAttribute(name: string, value: string): void;
}
interface FakeHandlers {
  element(el: FakeElement): void;
}

const instances: FakeRewriter[] = [];

class FakeRewriter {
  selector = '';
  handlers: FakeHandlers | undefined;
  constructor() {
    instances.push(this);
  }
  on(selector: string, handlers: FakeHandlers) {
    this.selector = selector;
    this.handlers = handlers;
    return this;
  }
  transform(response: Response) {
    return response;
  }
}

describe('withLowScriptPriority', () => {
  beforeEach(() => {
    instances.length = 0;
    vi.stubGlobal('HTMLRewriter', FakeRewriter);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks external module scripts and preloads low priority on HTML', () => {
    const response = new Response('<html></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    withLowScriptPriority(response);
    expect(instances).toHaveLength(1);
    const [rewriter] = instances;
    expect(rewriter?.selector).toBe(
      'link[rel="modulepreload"], script[type="module"][src]',
    );
    const setAttribute = vi.fn();
    rewriter?.handlers?.element({ setAttribute });
    expect(setAttribute).toHaveBeenCalledWith('fetchpriority', 'low');
  });

  it.each([
    {
      name: 'JSON',
      headers: new Headers({ 'content-type': 'application/json' }),
    },
    { name: 'no content type', headers: new Headers() },
  ])('passes $name responses through', ({ headers }) => {
    const response = new Response(null, { headers });
    expect(withLowScriptPriority(response)).toBe(response);
    expect(instances).toHaveLength(0);
  });
});
