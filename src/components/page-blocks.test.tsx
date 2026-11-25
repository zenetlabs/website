import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb, RelatedLinks } from '@/components/page-blocks';
import { FactList, HeroHeading } from '@/components/plain-hero';
import { hubNames } from '@/lib/crumb-names';
import { pagePath } from '@/lib/page-registry';
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
