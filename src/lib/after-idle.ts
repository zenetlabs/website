// Resolves after the page's `load` event and the next idle period (or 2 s at
// most): the moment the slot rails may fetch without touching the first paint.
export function afterLoadAndIdle(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => resolve(), { timeout: 2000 });
      } else setTimeout(resolve, 200);
    };
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });
  });
}
