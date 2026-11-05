import { createIsomorphicFn } from '@tanstack/react-start';
import { fetchAvailability, type PageAvailability } from '@/lib/booking-client';
import type { ConfirmView } from '@/lib/confirm-view';

export const bookAvailability = createIsomorphicFn()
  .server(
    async (): Promise<PageAvailability> =>
      (await import('@/server/book-page')).pageAvailability(),
  )
  .client((): Promise<PageAvailability> => fetchAvailability());

export const bookConfirmation = createIsomorphicFn()
  .server(
    async (token: string, outcome: string | null): Promise<ConfirmView> =>
      (await import('@/server/book-page')).pageConfirmation(token, outcome),
  )
  .client(
    async (token: string, outcome: string | null): Promise<ConfirmView> => {
      const { fetchConfirmation, outcomeOf } = await import(
        '@/lib/confirm-view'
      );
      return fetchConfirmation(token, outcomeOf(outcome));
    },
  );
