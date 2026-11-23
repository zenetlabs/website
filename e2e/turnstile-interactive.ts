import type { Page } from '@playwright/test';

export type FakeTurnstile = {
  interactive: boolean;
  // Runs that answer with an error before one succeeds, Turnstile's retries.
  errors: number;
  code: string;
  runs: number;
};

declare global {
  interface Window {
    __fakeTurnstile?: FakeTurnstile;
  }
}

// A stand-in for Turnstile's api.js, driven from the test: the "checkbox" is
// a plain element (a disabled fieldset cannot reach the real iframe either),
// and ticking it hands over the testing token. It can ask for the checkbox,
// like the testing site key that forces an interactive challenge, and answer
// with errors first, retrying the way `retry: 'auto'` does (100 ms apart here).
const fakeApi = (config: Omit<FakeTurnstile, 'runs'>) => `(() => {
  window.__fakeTurnstile = { ...${JSON.stringify(config)}, runs: 0 };
  const onload = new URL(document.currentScript.src).searchParams.get('onload');
  const widgets = new Map();
  let next = 0;
  const find = (target) =>
    widgets.get(target) ?? [...widgets.values()].find((w) => w.el === target);
  function ask(widget) {
    widget.params['before-interactive-callback']?.();
    const box = document.createElement('div');
    box.setAttribute('role', 'button');
    box.setAttribute('aria-label', 'Fake Turnstile checkbox');
    box.dataset.fakeTurnstile = '';
    box.tabIndex = 0;
    box.style.cssText = 'display:block;width:28px;height:28px;border:2px solid';
    box.addEventListener('click', () => {
      box.remove();
      widget.response = 'XXXX.DUMMY.TOKEN.XXXX';
      widget.params['after-interactive-callback']?.();
      widget.params.callback?.(widget.response);
    });
    widget.el.appendChild(box);
  }
  function run(widget) {
    const fake = window.__fakeTurnstile;
    fake.runs += 1;
    if (fake.errors > 0) {
      fake.errors -= 1;
      // Armed first: the callback may reset the widget, which must stop it.
      widget.retry = setTimeout(() => run(widget), 100);
      widget.params['error-callback']?.(fake.code);
      return;
    }
    if (fake.interactive) ask(widget);
    else widget.params.callback?.((widget.response = 'XXXX.DUMMY.TOKEN.XXXX'));
  }
  function clear(widget) {
    clearTimeout(widget.retry);
    widget.response = '';
    widget.el.querySelectorAll('[data-fake-turnstile]').forEach((n) => n.remove());
  }
  window.turnstile = {
    render(target, params) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      const id = 'fake-' + ++next;
      const widget = { id, el, params, response: '' };
      widgets.set(id, widget);
      if ((params.execution ?? 'render') === 'render') setTimeout(() => run(widget));
      return id;
    },
    execute(target) {
      const widget = find(target);
      if (widget) setTimeout(() => run(widget));
    },
    reset(target) {
      const widget = find(target);
      if (widget) clear(widget);
    },
    remove(target) {
      const widget = find(target);
      if (widget) {
        clear(widget);
        widgets.delete(widget.id);
      }
    },
    getResponse: (target) => find(target)?.response,
    isExpired: () => false,
    ready: (callback) => callback(),
  };
  if (onload && typeof window[onload] === 'function') window[onload]();
})();`;

export async function fakeTurnstile(
  page: Page,
  config: Partial<Omit<FakeTurnstile, 'runs'>> = {},
): Promise<void> {
  const body = fakeApi({
    interactive: false,
    errors: 0,
    code: '300030',
    ...config,
  });
  await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body }),
  );
}

export async function forceInteractiveTurnstile(page: Page): Promise<void> {
  await fakeTurnstile(page, { interactive: true });
}
