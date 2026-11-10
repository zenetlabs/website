import type { Page } from '@playwright/test';

// A stand-in for Turnstile's api.js that always asks for the checkbox, like
// the testing site key that forces an interactive challenge, but driven from
// the test: the "checkbox" is a plain element (a disabled fieldset cannot
// reach the real iframe either), and ticking it hands over the testing token.
const FAKE_API = `(() => {
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
  function clear(widget) {
    widget.response = '';
    widget.el.querySelectorAll('[data-fake-turnstile]').forEach((n) => n.remove());
  }
  window.turnstile = {
    render(target, params) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      const id = 'fake-' + ++next;
      const widget = { id, el, params, response: '' };
      widgets.set(id, widget);
      if ((params.execution ?? 'render') === 'render') setTimeout(() => ask(widget));
      return id;
    },
    execute(target) {
      const widget = find(target);
      if (widget) setTimeout(() => ask(widget));
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

export async function forceInteractiveTurnstile(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_API }),
  );
}
