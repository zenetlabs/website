import { showContactForm } from '@/lib/contact-door';
import { contactDraftTarget } from '@/lib/contact-draft';
import { localeFromPath } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { navHref } from '@/lib/nav';
import type { NavigateDeps } from '@/lib/navigate-client';
import type { ToolEnvelope } from '@/lib/webmcp/confirmation';

// Nothing is sent: the visitor reviews the draft, adds their details and sends
// the form. On the contact page nothing reloads, so what they typed stays.
export function runOpenContactForm(
  input: unknown,
  deps: NavigateDeps,
): ToolEnvelope {
  const pathname = deps.pathname();
  const locale = localeFromPath(pathname);
  const target = contactDraftTarget(
    locale,
    pathname,
    isRecord(input) ? input.message : undefined,
  );
  if (target === null) {
    return {
      ok: false,
      error: 'invalid',
      issues: [{ path: 'message', message: 'Expected 1 to 1500 characters' }],
    };
  }
  if ('current' in target) {
    showContactForm();
    return {
      ok: true,
      result: { url: navHref(locale, { page: 'contact' }), current: true },
    };
  }
  deps.schedule(() => deps.assign(target.url));
  return { ok: true, result: { url: target.url } };
}
