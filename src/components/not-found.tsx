import { Container } from '@/components/section';
import { LEAD, PRIMARY_BUTTON_FULL } from '@/components/ui';
import { type Locale, useMessages } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

export function NotFound({ locale }: { locale: Locale }) {
  const { notFound, nav } = useMessages();
  const doors = [
    { href: navHref(locale, CTA_TARGET), label: nav.cta },
    { href: pagePath(locale, 'services'), label: nav.services },
    { href: pagePath(locale, 'pricing'), label: nav.pricing },
  ];

  return (
    <section className="bg-tint">
      <Container className="grid gap-12 py-section lg:grid-cols-12 lg:items-end lg:gap-6">
        <div className="lg:col-span-6">
          <h1 className="text-display-2">{notFound.title}</h1>
          <p className={`mt-6 ${LEAD}`}>{notFound.description}</p>
          <a
            href={pagePath(locale, 'home')}
            className={`mt-8 ${PRIMARY_BUTTON_FULL}`}
          >
            {notFound.home}
          </a>
        </div>
        <ul className="grid gap-3 lg:col-span-5 lg:col-start-8">
          {doors.map((door) => (
            <li key={door.href}>
              <a href={door.href} className="door">
                {door.label}
                <span
                  aria-hidden="true"
                  className="icon icon-arrow door-arrow"
                />
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
