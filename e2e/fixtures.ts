import { test as base } from '@playwright/test';

// The home hero's intro never starts in a spec's pages: every spec meets the
// switchboard's final frame (its natural styles), as an in-app visitor does.
// Only switchboard.e2e.ts, which imports Playwright's own `test`, plays it.
// React 19 skips a foreign tag in <head> while hydrating.
export function stillIntro() {
  const style = document.createElement('style');
  style.textContent =
    '[data-switchboard] *, [data-switchboard] *::after { animation: none !important; }';
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
