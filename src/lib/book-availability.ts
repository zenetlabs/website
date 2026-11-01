import { createIsomorphicFn } from '@tanstack/react-start';
import { fetchAvailability, type PageAvailability } from '@/lib/booking-client';

export const bookAvailability = createIsomorphicFn()
  .server(
    async (): Promise<PageAvailability> =>
      (await import('@/server/book-page')).pageAvailability(),
  )
  .client((): Promise<PageAvailability> => fetchAvailability());
