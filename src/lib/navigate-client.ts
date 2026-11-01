import { localeFromPath } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import {
  NAVIGATE_SECTIONS,
  type NavigateSection,
  resolveNavigation,
} from '@/lib/navigate';
import { PAGE_IDS, type PageId } from '@/lib/page-registry';
import { SITE } from '@/lib/site';
import type { ToolEnvelope } from '@/lib/webmcp/confirmation';

export type NavigateDeps = {
  pathname: () => string;
  schedule: (run: () => void) => void;
  assign: (url: string) => void;
};

type Parsed =
  | { ok: true; page: PageId; section: NavigateSection | undefined }
  | { ok: false; path: string; message: string };

// Only registry pages and the known home sections: a URL is never accepted.
export function parseNavigateInput(input: unknown): Parsed {
  if (!isRecord(input))
    return { ok: false, path: '', message: 'Expected an object' };
  const page = PAGE_IDS.find((candidate) => candidate === input.page);
  if (page === undefined)
    return { ok: false, path: 'page', message: 'Unknown page' };
  if (input.section === undefined)
    return { ok: true, page, section: undefined };
  const section = NAVIGATE_SECTIONS.find(
    (candidate) => candidate === input.section,
  );
  return section === undefined
    ? { ok: false, path: 'section', message: 'Unknown section' }
    : { ok: true, page, section };
}

export function runNavigate(input: unknown, deps: NavigateDeps): ToolEnvelope {
  const parsed = parseNavigateInput(input);
  if (!parsed.ok) {
    return {
      ok: false,
      error: 'invalid',
      issues: [{ path: parsed.path, message: parsed.message }],
    };
  }
  const pathname = deps.pathname();
  const url = resolveNavigation(
    { page: parsed.page, section: parsed.section },
    localeFromPath(pathname),
    SITE,
  );
  if (url === null) return { ok: false, error: 'unknown_target' };
  if (url === pathname) return { ok: true, result: { url, current: true } };
  // After the result is delivered: a navigation would drop it.
  deps.schedule(() => deps.assign(url));
  return { ok: true, result: { url } };
}
