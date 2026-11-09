import type { Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPrice } from '@/lib/money';

// The diagnostic's price for /book's facts. Imported dynamically by the route
// loader: a dynamic import of `money` itself would add a namespace object to
// the chunk home loads up front.
export function diagnosticPrice(locale: Locale, services: Services): string {
  return formatPrice(locale, services.diagnostic.prices[0]);
}
