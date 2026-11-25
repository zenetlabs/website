import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanySheet } from '@/components/company-sheet';
import { aboutPage as enAbout } from '@/content/en/about';
import { companies as enCompanies } from '@/content/en/companies';
import { PORTFOLIO } from '@/lib/portfolio';

describe('CompanySheet', () => {
  function view() {
    return render(
      <CompanySheet
        title={enAbout.companies.title}
        lead={enAbout.companies.lead}
        companies={enCompanies}
      />,
    );
  }

  it('links the five companies in portfolio order, each named for screen readers', () => {
    const { container } = view();
    const links = [...container.querySelectorAll('a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      PORTFOLIO.map(({ href }) => href),
    );
    links.forEach((link, index) => {
      expect(link.querySelector('.sr-only')?.textContent).toBe(
        PORTFOLIO[index]?.name,
      );
    });
  });

  it('draws logos by mask, never as images', () => {
    const { container } = view();
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('.logo')).toHaveLength(5);
  });

  it('spaces the category items so the text reads as words', () => {
    const { container } = view();
    expect(container.textContent).toContain('Travel Group tours');
  });

  it('titles the sheet with the section heading', () => {
    const { container } = view();
    expect(container.querySelector('h2#companies-title')?.textContent).toBe(
      enAbout.companies.title,
    );
    expect(container).toHaveTextContent(enAbout.companies.lead);
  });

  it('closes with the lead only when it has one', () => {
    const { container } = render(
      <CompanySheet title="Companies" companies={enCompanies} />,
    );
    expect(container.querySelector('ul + p')).toBeNull();
  });
});
