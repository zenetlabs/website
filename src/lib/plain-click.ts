import type { MouseEvent } from 'react';

// A primary click with no modifier: the only click a link may take over. A
// middle click or Cmd/Ctrl-click still opens the link's own page.
export function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
