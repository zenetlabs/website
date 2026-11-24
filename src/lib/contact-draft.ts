import type { Locale } from '@/lib/i18n';
import { contactWithMessage, navHref } from '@/lib/nav';

// An agent's draft: short enough to keep `?message=` a small URL.
export const AGENT_MESSAGE_MAX = 1500;

// What an agent drafted for the form: compatibility-normalised, invisible
// format and control characters removed, 1 to AGENT_MESSAGE_MAX characters.
// Anything else is not a message.
export function agentMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/[^\P{Cc}\n]/gu, ' ')
    .trim();
  return clean === '' || clean.length > AGENT_MESSAGE_MAX ? null : clean;
}

// Where an agent's drafted message goes: the contact form with the text in it,
// or nowhere when the visitor is already on the contact page (a navigation
// would throw away what they typed), or null when the text is not a message.
// Every surface asks this one rule and only decides how to deliver the answer.
// Kept out of `nav.ts`, which the home page loads up front: only lazy chunks
// (WebMCP, the voice panel) and the server use it.
export function contactDraftTarget(
  locale: Locale,
  pathname: string,
  message: unknown,
): { url: string } | { current: true } | null {
  const clean = agentMessage(message);
  if (clean === null) return null;
  return pathname === navHref(locale, { page: 'contact' })
    ? { current: true }
    : { url: contactWithMessage(locale, clean) };
}
