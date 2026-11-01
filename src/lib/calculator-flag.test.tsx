import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalculatorCallout } from '@/components/calculator-callout';
import { ServiceLadder } from '@/components/service-ladder';
import { home as enHome } from '@/content/en/home';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { legalEntity } from '@/lib/content';
import { locales } from '@/lib/i18n';
import { buildLlmsFull, buildLlmsTxt } from '@/lib/llms';
import { markdownPath, pagePath, pagesIn } from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { buildSitemap } from '@/lib/sitemap';
import { SERVICES } from '../../test/page-content';
import { SERVICE_BODIES } from '../../test/service-bodies';

const ON = { calculator: { published: true } };
const OFF = { calculator: { published: false } };

describe('the calculator, published', () => {
  it.each(locales)('lists it for %s, right after pricing', (locale) => {
    const pages = pagesIn(locale, ON);
    expect(pages[pages.indexOf('pricing') + 1]).toBe('calculator');
  });

  it.each(locales)('puts %s in the sitemap with its alternates', (locale) => {
    const loc = pageUrl(locale, 'calculator');
    const xml = buildSitemap(ON);
    expect(xml).toContain(`<loc>${loc}</loc>`);
    expect(xml).toContain(`hreflang="${locale}" href="${loc}"`);
    expect(buildSitemap(OFF)).not.toContain(loc);
  });

  it.each(locales)(
    'lists %s in llms.txt and describes it in llms-full',
    async (locale) => {
      const { calculator } = SERVICE_BODIES[locale];
      const entity = legalEntity(locale);
      const url = markdownPath(locale, 'calculator');
      expect(await buildLlmsTxt(locale, entity, ON)).toContain(
        `[${calculator.meta.metaTitle}](https://zenetlabs.com${url}): ${calculator.meta.description}`,
      );
      const full = await buildLlmsFull(locale, entity, ON);
      expect(full).toContain(
        `## [${calculator.meta.title}](${pageUrl(locale, 'calculator')})`,
      );
      expect(full).toContain(calculator.disclaimer.text);
      expect(full).toContain(calculator.questions.tools.options.custom.label);
      expect(await buildLlmsFull(locale, entity, OFF)).not.toContain(
        calculator.disclaimer.text,
      );
    },
  );

  it('links to it from the home ladder only while published', () => {
    const { rerender } = render(
      <ServiceLadder
        copy={enHome.services}
        services={SERVICES.en}
        locale="en"
        site={ON}
      />,
    );
    expect(
      screen.getByRole('link', { name: `${enHome.services.calculator} →` }),
    ).toHaveAttribute('href', pagePath('en', 'calculator'));
    rerender(
      <ServiceLadder
        copy={enHome.services}
        services={SERVICES.en}
        locale="en"
        site={OFF}
      />,
    );
    expect(
      screen.queryByRole('link', { name: `${enHome.services.calculator} →` }),
    ).toBeNull();
  });

  it.each([
    ['en', enPricing, '/pricing/calculator'],
    ['es', esPricing, '/es/precios/calculadora'],
  ] as const)(
    'shows the %s pricing callout only while published',
    (locale, pricing, href) => {
      const { rerender } = render(
        <CalculatorCallout
          copy={pricing.calculator}
          locale={locale}
          site={ON}
        />,
      );
      expect(
        screen.getByRole('link', { name: `${pricing.calculator.link} →` }),
      ).toHaveAttribute('href', href);
      expect(
        screen.getByRole('heading', { name: pricing.calculator.title }),
      ).toBeInTheDocument();
      rerender(
        <CalculatorCallout
          copy={pricing.calculator}
          locale={locale}
          site={OFF}
        />,
      );
      expect(screen.queryByRole('link', { name: /→/ })).toBeNull();
      expect(screen.queryByText(pricing.calculator.title)).toBeNull();
    },
  );

  it('keeps the callout off in the production build by default', () => {
    render(<CalculatorCallout copy={enPricing.calculator} locale="en" />);
    expect(screen.queryByText(enPricing.calculator.title)).toBeNull();
  });
});
