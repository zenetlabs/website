import { test as base } from '@playwright/test';

// No scene (`data-scene`: the home Switchboard, the inner boards) starts in a
// spec's pages: every spec meets its final frame (its natural styles), as an
// in-app visitor does. Only switchboard.e2e.ts and flow-board.e2e.ts, which
// import Playwright's own `test`, play them.
// React 19 skips a foreign tag in <head> while hydrating.
export function stillIntro() {
  const style = document.createElement('style');
  style.textContent =
    '[data-scene] *, [data-scene] *::after { animation: none !important; }';
  const place = () => {
    if (!document.head) return false;
    document.head.appendChild(style);
    return true;
  };
  if (place()) return;
  new MutationObserver((_, observer) => {
    if (place()) observer.disconnect();
  }).observe(document, { childList: true, subtree: true });
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(stillIntro);
    await use(context);
  },
});
