import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Breadcrumb,
  CardGrid,
  DataTable,
  FactList,
  FactsHero,
  GetStarted,
  HeroHeading,
  RelatedLinks,
} from '@/components/page-blocks';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { titleText } from '@/lib/title-text';
import { HUB, HUB_ES, SPANISH } from '../../test/landing';
import { SERVICES } from '../../test/page-content';
import { SERVICE_BODIES } from '../../test/service-bodies';

const labels = HUB_ES.labels;
const pair = SPANISH.holdedHubspot;
const names = hubNames(HUB_ES);

describe('Breadcrumb', () => {
  it('links every step but the last, which is marked current', () => {
    render(
      <Breadcrumb
        page="holdedHubspot"
        locale="es"
        names={names}
        label={labels.breadcrumb}
      />,
    );
    const trail = screen.getByRole('navigation', { name: labels.breadcrumb });
    expect(
      within(trail)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      pagePath('es', 'home'),
      pagePath('es', 'services'),
      pagePath('es', 'integrations'),
    ]);
    expect(trail.querySelector('[aria-current="page"]')?.textContent).toBe(
      HUB_ES.landing.holdedHubspot,
    );
    expect(trail.querySelector('ol')?.className).toContain('whitespace-nowrap');
  });

  it('has two levels under a service page', () => {
    render(
      <Breadcrumb
        page="agents"
        locale="en"
        names={hubNames(HUB.en)}
        label={HUB.en.labels.breadcrumb}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});

describe('FactsHero', () => {
  function view(locale: Locale, breadcrumb = false) {
    const body = SERVICE_BODIES[locale].pages.agents;
    return {
      body,
      ...render(
        <FactsHero
          page="agents"
          locale={locale}
          services={SERVICES[locale]}
          labels={SERVICE_BODIES[locale].hub.labels}
          hero={body.hero}
          facts={body.facts}
          button={body.cta.button}
          breadcrumb={
            breadcrumb ? (
              <Breadcrumb
                page="agents"
                locale={locale}
                names={hubNames(SERVICE_BODIES[locale].hub)}
                label={SERVICE_BODIES[locale].hub.labels.breadcrumb}
              />
            ) : undefined
          }
        />,
      ),
    };
  }

  it.each(['en', 'es'] as const)(
    'renders the %s title and four facts',
    (locale) => {
      const { body, container } = view(locale);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        titleText(body.hero.title),
      );
      const l = SERVICE_BODIES[locale].hub.labels;
      expect(
        [...container.querySelectorAll('dt')].map((dt) => dt.textContent),
      ).toEqual([l.who, l.price, l.timeline, l.start]);
      expect(container.querySelectorAll('dd')[1]?.textContent).toBe(
        `${formatPriceSummary(locale, SERVICES[locale].agent.prices)} (${l.taxNote})`,
      );
    },
  );

  it('sends the button to the booking CTA and the link to its pricing card', () => {
    const { body } = view('es');
    expect(screen.getByRole('link', { name: body.cta.button })).toHaveAttribute(
      'href',
      navHref('es', CTA_TARGET),
    );
    expect(
      screen.getByRole('link', { name: `${labels.pricing} →` }),
    ).toHaveAttribute('href', '/es/precios#agent');
  });

  it('spaces the eyebrow only under a breadcrumb', () => {
    const { container, unmount } = view('es');
    expect(container.querySelector('p')?.className).not.toContain('mt-10');
    unmount();
    const withTrail = view('es', true);
    expect(
      withTrail.container.querySelector('p:not(nav p)')?.className,
    ).toContain('mt-10');
  });
});

describe('HeroHeading and FactList', () => {
  it('render the heading, the lead and the facts', () => {
    const { container } = render(
      <>
        <HeroHeading eyebrow="E" title={pair.hero.title} lead="Lead" />
        <FactList
          facts={[
            { id: 'a', label: 'A', value: '1' },
            { id: 'b', label: 'B', value: '2', mono: true },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      titleText(pair.hero.title),
    );
    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(container.querySelectorAll('dd')[1]).toHaveClass('font-mono');
  });
});

describe('GetStarted', () => {
  it('shows the call to action and the contact email', () => {
    render(<GetStarted locale="es" cta={pair.cta} mail={labels.mail} />);
    expect(screen.getByRole('link', { name: pair.cta.button })).toHaveAttribute(
      'href',
      navHref('es', CTA_TARGET),
    );
    expect(screen.getByRole('link', { name: PUBLIC_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${PUBLIC_EMAIL}`,
    );
  });
});

describe('RelatedLinks', () => {
  it('links the pages by hub name, then every service', () => {
    const { container } = render(
      <RelatedLinks
        locale="es"
        pages={pair.related}
        names={names}
        labels={labels}
      />,
    );
    const links = [...container.querySelectorAll('a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      ...pair.related.map((page) => pagePath('es', page)),
      pagePath('es', 'services'),
    ]);
    expect(links.at(-1)?.textContent).toBe(labels.allServices);
    expect(links[1]?.textContent).toBe(HUB_ES.landing.holdedPrestashop);
  });
});

describe('CardGrid', () => {
  it('links a title only when the card names a page', () => {
    const { container } = render(
      <CardGrid
        locale="es"
        items={[
          { id: 'a', title: 'Linked', text: 'x', page: 'verifactu' },
          { id: 'b', title: 'Plain', text: 'y' },
        ]}
      />,
    );
    const titles = container.querySelectorAll('h3');
    expect(titles[0]?.querySelector('a')).toHaveAttribute(
      'href',
      '/es/verifactu-integracion',
    );
    expect(titles[1]?.querySelector('a')).toBeNull();
  });
});

describe('DataTable', () => {
  it('labels the columns and uses the first cell as the row header', () => {
    const { container } = render(
      <DataTable
        labelledBy="x"
        columns={['A', 'B']}
        rows={[{ id: 'r', cells: ['head', 'cell'] }]}
      />,
    );
    expect(container.querySelector('table')).toHaveAttribute(
      'aria-labelledby',
      'x',
    );
    expect(container.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    expect(container.querySelector('tbody th[scope="row"]')?.textContent).toBe(
      'head',
    );
  });
});
