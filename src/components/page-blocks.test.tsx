import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb, RelatedLinks } from '@/components/page-blocks';
import {
  FactList,
  GetStarted,
  HeroHeading,
  UseCaseList,
} from '@/components/plain-hero';
import { hubNames } from '@/lib/crumb-names';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { titleText } from '@/lib/title-text';
import { HUB, HUB_ES, SPANISH } from '../../test/landing';

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

describe('HeroHeading and FactList', () => {
  it('render the heading, the lead and the facts', () => {
    const { container } = render(
      <>
        <HeroHeading title={pair.hero.title} lead="Lead" />
        <FactList
          facts={[
            { id: 'a', label: 'A', value: '1' },
            { id: 'b', label: 'B', value: '2' },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      titleText(pair.hero.title),
    );
    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(container.querySelectorAll('dd')[1]).toHaveTextContent('2');
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

describe('UseCaseList', () => {
  it('links a title only when the card names a page', () => {
    const { container } = render(
      <UseCaseList
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
