import { createIsomorphicFn } from '@tanstack/react-start';
import type { BookAvailability } from '@/lib/booking-calendar';
import type { ConfirmView } from '@/lib/confirm-view';

export const bookAvailability = createIsomorphicFn()
  .server(
    async (): Promise<BookAvailability> =>
      (await import('@/server/book-page')).pageAvailability(),
  )
  .client(async (): Promise<BookAvailability> => {
    // The calendar's chunk loads alongside the times, so it never pops in.
    void import('@/components/slot-picker');
    return (await import('@/lib/book-slots')).fetchBookAvailability();
  });

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
