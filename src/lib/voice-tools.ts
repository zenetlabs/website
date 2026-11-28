import type { VoiceCopy } from '@/content/types';
import { showContactForm } from '@/lib/contact-door';
import { contactDraftTarget } from '@/lib/contact-draft';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { resolveNavigation } from '@/lib/navigate';
import { parseNavigateInput } from '@/lib/navigate-client';
import { SITE } from '@/lib/site';

type NavigateResult = 'opened' | 'not_available' | 'invalid';

// The tool the agent calls to open a page. Only registry pages and the known
// home sections resolve, so a spoken request cannot go anywhere else.
export function navigateTool({
  locale,
  copy,
  push,
  onOpened,
}: {
  locale: Locale;
  copy: Pick<VoiceCopy, 'pages' | 'sections'>;
  push: (href: string) => void;
  onOpened: (label: string) => void;
}): (params: unknown) => Promise<NavigateResult> {
  return async (params) => {
    const parsed = parseNavigateInput(params);
    if (!parsed.ok) return 'invalid';
    const href = resolveNavigation(
      { page: parsed.page, section: parsed.section },
      locale,
      SITE,
    );
    if (href === null) return 'not_available';
    push(href);
    onOpened(
      parsed.page === 'home' && parsed.section !== undefined
        ? copy.sections[parsed.section]
        : copy.pages[parsed.page],
    );
    return 'opened';
  };
}

type ContactResult = 'opened' | 'already_open' | 'invalid';

// The tool the agent calls after a yes to put its message into the contact
// form. Nothing is sent: the visitor adds their details and sends it. Already
// on the contact page nothing is pushed, so what they typed stays.
export function contactDraftTool({
  locale,
  copy,
  push,
  pathname,
  onOpened,
}: {
  locale: Locale;
  copy: Pick<VoiceCopy, 'pages'>;
  push: (href: string) => void;
  pathname: () => string;
  onOpened: (label: string) => void;
}): (params: unknown) => Promise<ContactResult> {
  return async (params) => {
    const target = contactDraftTarget(
      locale,
      pathname(),
      isRecord(params) ? params.message : undefined,
    );
    if (target === null) return 'invalid';
    if ('current' in target) {
      showContactForm();
      return 'already_open';
    }
    push(target.url);
    onOpened(copy.pages.contact);
    return 'opened';
  };
}

// The label of a held request in the full result of book_meeting (the visitor
// confirms it from the email), or null for anything else (a rejection, a
// truncated payload, malformed JSON).
export function pendingLabel(fullToolResult: string): string | null {
  try {
    const value: unknown = JSON.parse(fullToolResult);
    if (!isRecord(value) || value.ok !== true || !isRecord(value.result)) {
      return null;
    }
    const { status, label } = value.result;
    return status === 'pending' && typeof label === 'string' ? label : null;
  } catch {
    return null;
  }
}
