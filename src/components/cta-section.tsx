import { Container } from '@/components/section';
import { PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';

export function CtaSection({
  copy,
  locale,
  secondary,
}: {
  copy: { title: string; text: string; button: string };
  locale: Locale;
  secondary?: { label: string; href: string };
}) {
  return (
    <section aria-labelledby="cta-title" className="border-t border-hairline">
      <Container className="py-20 md:py-28">
        <h2 id="cta-title" className="max-w-3xl text-balance">
          {copy.title}
        </h2>
        <p className="mt-6 max-w-xl text-lg text-muted-fg">{copy.text}</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a href={navHref(locale, CTA_TARGET)} className={PRIMARY_BUTTON}>
            {copy.button}
          </a>
          {secondary ? (
            <a href={secondary.href} className={`font-medium ${TEXT_LINK}`}>
              {secondary.label} →
            </a>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
