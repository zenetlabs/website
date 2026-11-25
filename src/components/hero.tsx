import { AgentDesk } from '@/components/agent-desk';
import { CtaLink } from '@/components/cta-link';
import { SlotRail } from '@/components/next-slots';
import { Container, EmphasisTitle } from '@/components/section';
import { Switchboard, useSwitchboard } from '@/components/switchboard';
import { LEAD, PRIMARY_BUTTON_FULL } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { isPublished } from '@/lib/page-registry';
import { SITE } from '@/lib/site';

export function Hero({
  copy,
  desk,
  diagnosticPrice,
  locale,
}: {
  copy: HomeContent['hero'];
  desk: HomeContent['desk'];
  diagnosticPrice: string;
  locale: Locale;
}) {
  const [factBefore = '', factAfter = ''] = copy.fact.split('{price}');
  const { intro, stop, press, click, stageRef, toggle } = useSwitchboard();
  return (
    <section
      data-ground="tint"
      className="bg-tint"
      onPointerDownCapture={press}
      onPointerUpCapture={press}
      onClickCapture={click}
      onKeyDownCapture={stop}
      onFocusCapture={stop}
    >
      <Container className="hero-grid">
        <h1 className="text-display-1">
          <EmphasisTitle parts={copy.title} />
        </h1>
        <div className="hero-actions">
          <CtaLink
            cta="hero"
            href={navHref(locale, CTA_TARGET)}
            className={PRIMARY_BUTTON_FULL}
          >
            <span aria-hidden="true" className="icon icon-calendar size-5" />
            {copy.primary}
          </CtaLink>
        </div>
        <Switchboard
          copy={copy.stage}
          intro={intro}
          stageRef={stageRef}
          toggle={toggle}
        >
          <AgentDesk
            copy={desk}
            locale={locale}
            footer={
              <SlotRail
                copy={desk.slots}
                locale={locale}
                booking={isPublished('book', SITE)}
              />
            }
          />
        </Switchboard>
        <div className="hero-pitch">
          <p className={`${LEAD} lg:col-span-7`}>{copy.lead}</p>
          <div className="lg:col-span-5">
            <p className="max-w-[34em] text-ui-s text-fg-soft">
              {factBefore}
              <strong className="font-semibold text-fg">
                {diagnosticPrice}
              </strong>
              {factAfter}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
