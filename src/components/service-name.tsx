import { H3 } from '@/components/ui';
import type { Service } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { serviceHref } from '@/lib/page-registry';

// Linked to the service's page by default (the pricing page for a line without
// one); `null` sets it as plain text, as on the pricing page itself.
export function ServiceName({
  service,
  locale,
  heading: Tag,
  href,
}: {
  service: Service;
  locale: Locale;
  heading: 'h2' | 'h3';
  href?: string | null;
}) {
  const target = href === undefined ? serviceHref(locale, service.id) : href;
  return (
    <Tag className={H3}>
      {target ? (
        <a href={target} className="hover-line">
          {service.name}
        </a>
      ) : (
        service.name
      )}
    </Tag>
  );
}
