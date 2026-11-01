import { StartClient } from '@tanstack/react-start/client';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});

function bootAnalytics() {
  const id = __GA4_ID__;
  if (id === null) return;
  const start = () =>
    import('@/lib/analytics').then((m) => m.startAnalytics(id, Date.now()));
  if (document.readyState === 'complete') void start();
  else window.addEventListener('load', () => void start(), { once: true });
}

bootAnalytics();

// Only where the browser exposes WebMCP; a dark build folds this away.
function bootWebMcp() {
  if (!__WEBMCP__) return;
  if (!('modelContext' in document || 'modelContext' in navigator)) return;
  import('@/lib/webmcp/boot')
    .then((m) => m.scheduleWebMcp())
    .catch(() => undefined);
}

bootWebMcp();
