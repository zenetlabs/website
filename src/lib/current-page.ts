import { useMatches } from '@tanstack/react-router';
import type { PageId } from '@/lib/page-registry';

export function hasNotFound(
  matches: ReadonlyArray<{ status: string; _notFound?: boolean }>,
): boolean {
  return matches.some(
    (entry) => entry.status === 'notFound' || entry._notFound === true,
  );
}

export function useCurrentPage(): PageId | undefined {
  return useMatches({
    select: (matches) =>
      hasNotFound(matches)
        ? undefined
        : matches.findLast((match) => match.staticData.page)?.staticData.page,
  });
}
