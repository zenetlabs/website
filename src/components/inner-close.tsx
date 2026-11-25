import { DeskClose } from '@/components/desk-close';
import type {
  DeskCloseCopy,
  FaqItem,
  PageCta,
  ServicesHubContent,
} from '@/content/types';
import { faqChips } from '@/lib/faq-chips';
import type { Locale } from '@/lib/i18n';

// The close of a service or landing page: its own call to action on home's
// desk, with the page's first two questions as the chips.
export function InnerClose({
  cta,
  faq,
  hub,
  close,
  locale,
}: {
  cta: PageCta;
  faq: { items: readonly FaqItem[] };
  hub: ServicesHubContent;
  close: DeskCloseCopy;
  locale: Locale;
}) {
  return (
    <DeskClose
      title={cta.title}
      lead={cta.text}
      mail={hub.labels.mail}
      human={close.human}
      doors={close.doors}
      desk={close.desk}
      chips={faqChips(faq.items)}
      locale={locale}
    />
  );
}
