import { companies } from '@/content/en/companies';
import { faq } from '@/content/en/faq';
import { home } from '@/content/en/home';
import { services } from '@/content/en/services';
import type { PublishedEntity } from '@/content/types';
import {
  formatAddress,
  foundedLine,
  legalEntity,
  taxIdLabel,
} from '@/lib/content';
import { type Locale, locales, messages } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { pagesIn } from '@/lib/page-registry';
import { pageCopy } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';
import { pageUrl, SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL } from '@/lib/site';

const { meta } = messages.en;
const SITE_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish',
};

const pages = locales.flatMap((locale) =>
  pagesIn(locale).map((page) => {
    const copy = pageCopy(locale, page);
    return `- [${copy.title}](${pageUrl(locale, page)}): ${copy.description}`;
  }),
);

function operatorSentences(
  entityOf: (locale: Locale) => PublishedEntity,
): string {
  const groups: { entity: PublishedEntity; locales: Locale[] }[] = [];
  for (const locale of locales) {
    const entity = entityOf(locale);
    const group = groups.find((candidate) => candidate.entity === entity);
    if (group) group.locales.push(locale);
    else groups.push({ entity, locales: [locale] });
  }
  return groups
    .map(({ entity, locales: served }) => {
      const sites = served.map((locale) => SITE_LANGUAGE[locale]).join(' and ');
      const founded = foundedLine(entity, 'en');
      return `The ${sites} ${served.length > 1 ? 'sites are' : 'site is'} operated by ${entity.legalName} (${taxIdLabel(entity)}), ${formatAddress(entity.address, 'en')}.${founded ? ` ${founded}.` : ''}`;
    })
    .join(' ');
}

export function buildLlmsTxt(
  entityOf: (locale: Locale) => PublishedEntity = legalEntity,
): string {
  return `${[
    `# ${SITE_NAME}`,
    `> ${meta.description}`,
    `${operatorSentences(entityOf)} Every page is also served as Markdown to requests that send \`Accept: text/markdown\`.`,
    [
      '## Services',
      ...Object.values(services).map(
        (service) =>
          `- [${service.name}](${pageUrl('en', 'pricing')}#${service.id}): ${formatPriceSummary('en', service.prices)}. ${service.summary}`,
      ),
    ].join('\n'),
    ['## Pages', ...pages].join('\n'),
    [
      '## FAQ',
      ...faq.map(
        ({ id, question, answer }) =>
          `- [${question}](${pageUrl('en', 'home')}#faq-${id}): ${answer}`,
      ),
    ].join('\n'),
    [
      '## Portfolio',
      ...PORTFOLIO.map(
        ({ key, name, href }) =>
          `- [${name}](${href}): ${companies[key].description} (${companies[key].category})`,
      ),
    ].join('\n'),
    [
      '## Contact',
      `- [Email](mailto:${PUBLIC_EMAIL}): ${home.contact.human}`,
      `- [Contact form](${pageUrl('en', 'home')}#contact): ${home.contact.lead}`,
    ].join('\n'),
  ].join('\n\n')}\n`;
}
