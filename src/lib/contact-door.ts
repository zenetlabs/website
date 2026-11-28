import type { ContactDoorId } from '@/content/types';

// The bridge from the agents (chat, voice, WebMCP) to the contact page's doors:
// when one of them points at the message box, the page opens its message door.
// Off the contact page nobody listens, so a request is a no-op there.

export const doorTabId = (id: ContactDoorId) => `door-${id}-tab`;
export const doorPanelId = (id: ContactDoorId) => `door-${id}`;

let asks = 0;
const listeners = new Set<() => void>();

export function subscribeContactForm(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function contactFormAsks(): number {
  return asks;
}

export function showContactForm(): void {
  asks += 1;
  for (const listener of listeners) listener();
}

// A dialog closing returns focus to its opener; when an agent has since
// switched doors, that opener is hidden and focus would fall to the page, so
// it goes to the message door's tab instead.
export function keepFocus(opener: HTMLElement | null): void {
  if (!opener || (opener.isConnected && shown(opener))) return;
  document.getElementById(doorTabId('message'))?.focus();
}

function shown(element: HTMLElement): boolean {
  return typeof element.checkVisibility === 'function'
    ? element.checkVisibility()
    : true;
}
