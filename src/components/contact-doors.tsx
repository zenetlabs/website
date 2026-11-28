import { useHydrated } from '@tanstack/react-router';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ContactDoorId, DoorCopy } from '@/content/types';
import {
  contactFormAsks,
  doorPanelId,
  doorTabId,
  subscribeContactForm,
} from '@/lib/contact-door';
import { isPlainClick } from '@/lib/plain-click';
import { track } from '@/lib/track';

export type ContactDoorItem = {
  id: ContactDoorId;
  copy: DoorCopy;
  icon: ReactNode;
  panel: ReactNode;
  // Shown in place of `panel` until the door has been opened once
  before?: ReactNode;
};

// The roles arrive with hydration: before it the doors are plain links.
function tabProps(id: ContactDoorId, selected: boolean) {
  return {
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': doorPanelId(id),
    tabIndex: selected ? 0 : -1,
  };
}

function panelProps(id: ContactDoorId, open: boolean) {
  return {
    role: 'tabpanel',
    'aria-labelledby': doorTabId(id),
    tabIndex: open ? 0 : undefined,
  };
}

// Where a key moves the selection, or null when it is not a tab key.
function targetIndex(key: string, at: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (at + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (at - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

// The contact page's doors: tabs with automatic activation over panels that
// are all in the page. The server render is plain in-page links (the closed
// panels are hidden by CSS, and shown again without JavaScript); the tab roles
// arrive with hydration. Every visit opens the message door, and an agent
// pointing at the message box opens it again.
export function ContactDoors({
  items,
  labelledBy,
}: {
  items: readonly ContactDoorItem[];
  labelledBy: string;
}) {
  const hydrated = useHydrated();
  const asks = useSyncExternalStore(
    subscribeContactForm,
    contactFormAsks,
    () => 0,
  );
  const [choice, setChoice] = useState<{ id: ContactDoorId; at: number }>({
    id: 'message',
    at: 0,
  });
  const [visited, setVisited] = useState<readonly ContactDoorId[]>([]);
  const tabs = useRef<(HTMLAnchorElement | null)[]>([]);
  const open = choice.at === asks ? choice.id : 'message';
  const tabbed = hydrated && items.length > 1;

  function choose(id: ContactDoorId) {
    if (id === open) return;
    setChoice({ id, at: asks });
    setVisited((known) => (known.includes(id) ? known : [...known, id]));
    track('cta_click', { cta_id: `contact_door_${id}` });
  }

  function onKeyDown(event: KeyboardEvent<HTMLAnchorElement>, from: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next =
      event.key === ' ' ? from : targetIndex(event.key, from, items.length);
    const item = next === null ? undefined : items[next];
    if (next === null || !item) return;
    event.preventDefault();
    choose(item.id);
    tabs.current[next]?.focus();
  }

  function onClick(event: MouseEvent<HTMLAnchorElement>, id: ContactDoorId) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    choose(id);
  }

  return (
    <div className="grid gap-6 md:gap-10">
      {items.length > 1 ? (
        <nav
          aria-labelledby={labelledBy}
          data-doors
          {...(tabbed ? { role: 'tablist' } : {})}
          className="contact-doors"
        >
          {items.map((item, index) => (
            <a
              key={item.id}
              id={doorTabId(item.id)}
              href={`#${doorPanelId(item.id)}`}
              className="door contact-door"
              {...(tabbed ? tabProps(item.id, open === item.id) : {})}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              onClick={(event) => onClick(event, item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.icon}
              <span>
                <span className="block">{item.copy.title}</span>
                <span className="door-text">{item.copy.text}</span>
              </span>
            </a>
          ))}
        </nav>
      ) : null}
      {items.map((item) => (
        <div
          key={item.id}
          id={doorPanelId(item.id)}
          data-door-panel
          data-open={open === item.id ? '' : undefined}
          {...(tabbed ? panelProps(item.id, open === item.id) : {})}
        >
          {open === item.id || visited.includes(item.id)
            ? item.panel
            : (item.before ?? item.panel)}
        </div>
      ))}
    </div>
  );
}
