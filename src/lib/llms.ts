import { COMPANY } from '@/lib/company';
import { locales, messages } from '@/lib/i18n';
import { PAGE_IDS } from '@/lib/page-registry';
import { pageCopy } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';
import { pageUrl, SITE_NAME } from '@/lib/seo';
import { serviceSummary } from '@/lib/services';
import { PUBLIC_EMAIL } from '@/lib/site';

const { meta, footer, services, work, contact } = messages.en;

const pages = locales.flatMap((locale) =>
  PAGE_IDS.map((page) => {
    const copy = pageCopy(locale, page);
    return `- [${copy.title}](${pageUrl(locale, page)}): ${copy.description}`;
  }),
);

export const LLMS_TXT = `${[
  `# ${SITE_NAME}`,
  `> ${meta.description}`,
  `${SITE_NAME} is operated by ${COMPANY.legalName} (${footer.uen}), ${footer.address}. ${footer.founded}. The site is in English and Spanish. Every page is also served as Markdown to requests that send \`Accept: text/markdown\`.`,
  [
    'Services:',
    ...Object.values(services.items).map((item) => {
      const { name, description } = serviceSummary(item);
      return `- ${name}: ${description}`;
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
