import type { PublishedEntity } from '@/content/types';
import {
  formatAddress,
  foundedLine,
  legalEntity,
  taxIdLabel,
} from '@/lib/content';
import { type Locale, locales, messages } from '@/lib/i18n';
import { pagesIn } from '@/lib/page-registry';
import { pageCopy } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';
import { pageUrl, SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL } from '@/lib/site';

const { meta, services, work, contact } = messages.en;
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
      'Services:',
      ...Object.values(services.items).map((item) => {
        return `- ${item.title}: ${Object.values(item.bullets).join('; ')}.`;
      }),
    ].join('\n'),
    ['## Pages', ...pages].join('\n'),
    [
      '## Portfolio',
      ...PORTFOLIO.map(
        ({ key, name, href }) =>
          `- [${name}](${href}): ${work.items[key].description} (${work.items[key].category})`,
      ),
    ].join('\n'),
    [
      '## Contact',
      `- [Email](mailto:${PUBLIC_EMAIL}): ${contact.human}`,
      `- [Contact form](${pageUrl('en', 'home')}#contact): ${contact.text}`,
    ].join('\n'),
  ].join('\n\n')}\n`;
}

export const LLMS_TXT = buildLlmsTxt();
