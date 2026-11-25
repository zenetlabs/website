import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Cases } from '@/components/cases';
import { casesHub as enHub } from '@/content/en/cases-hub';
import { casesHub as esHub } from '@/content/es/cases-hub';
import type { CasesHubContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';

const HUBS: readonly (readonly [Locale, CasesHubContent])[] = [
  ['en', enHub],
  ['es', esHub],
];

describe.each(HUBS)('Cases (%s)', (locale, hub) => {
  function view(copy: CasesHubContent['cases'] = hub.cases) {
    return render(<Cases copy={copy} intro={hub.intro} locale={locale} />);
  }

  it('renders two ruled entries, each with an h3', () => {
    const { container } = view();
    const items = container.querySelectorAll('li.case-item');
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.querySelector('h3.case-name')).not.toBeNull();
    }
  });

  it('opens with the moved sentence, then the section lead', () => {
    const { container } = view();
    const text = container.textContent ?? '';
    const lead = hub.cases.lead ?? '';
    expect(lead).not.toBe('');
    expect(text.indexOf(hub.intro)).toBeGreaterThan(-1);
    expect(text.indexOf(lead)).toBeGreaterThan(text.indexOf(hub.intro));
  });

  it('renders each tag item as its own span', () => {
    const { container } = view();
    const tags = [...container.querySelectorAll('.case-tag')];
    expect(
      tags.map((tag) =>
        [...tag.querySelectorAll('span')].map((s) => s.textContent),
      ),
    ).toEqual(hub.cases.items.map((item) => item.tag));
  });

  it('puts the flow board in the Viatsy entry only, with its steps', () => {
    const { container } = view();
    const boards = container.querySelectorAll('[data-flow-board]');
    expect(boards).toHaveLength(1);
    const [viatsy, taplany] = container.querySelectorAll('li.case-item');
    expect(viatsy?.contains(boards[0] ?? null)).toBe(true);
    expect(taplany?.querySelector('[data-flow-board]')).toBeNull();
    const [first] = hub.cases.items;
    expect(
      [...(boards[0]?.querySelectorAll('ol > li') ?? [])].map((li) =>
        li.getAttribute('data-actor'),
      ),
    ).toEqual(first?.flow?.steps.map((step) => step.actor));
  });

  it('keeps every automated line open, with nothing folded', () => {
    const { container } = view();
    expect(container.querySelector('summary')).toBeNull();
    for (const item of hub.cases.items) {
      for (const line of item.automated) {
        expect(container.textContent).toContain(line);
      }
    }
  });

  it('shows only the figures that are set, each with its qualifier', () => {
    const { container } = view();
    expect(container.querySelectorAll('dl')).toHaveLength(2);
    const text = container.textContent ?? '';
    expect(text).toContain(hub.cases.items[0]?.metrics[0]?.label);
    expect(text).toContain(hub.cases.items[1]?.metrics[1]?.label);
    expect(text).not.toContain(hub.cases.items[0]?.metrics[1]?.label);
    expect(text).not.toContain(hub.cases.items[1]?.metrics[0]?.label);
    const [viatsy, taplany] = container.querySelectorAll('li.case-item dd');
    expect(taplany?.textContent).toBe(locale === 'en' ? 'about 40' : 'unos 40');
    expect(viatsy?.textContent).toBe(
      locale === 'en' ? '8 h estimated' : '8 h estimación',
    );
  });

  it('links only the Viatsy entry, to its case page by name', () => {
    const { container } = view();
    const links = [...container.querySelectorAll('li a')];
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      'href',
      locale === 'en' ? '/case-studies/viatsy' : '/es/casos/viatsy',
    );
    expect(links[0]?.closest('li')?.querySelector('h3')?.textContent).toBe(
      'Viatsy',
    );
  });

  it('shows a metric once it has a value', () => {
    const [first, ...rest] = hub.cases.items;
    if (!first) throw new Error('no case');
    const copy = {
      ...hub.cases,
      items: [
        {
          ...first,
          metrics: [
            { id: 'hours', label: 'Hours saved', value: 12, unit: ' h' },
          ],
        },
        ...rest.map((item) => ({ ...item, metrics: [] })),
      ],
    };
    view(copy);
    expect(screen.getByText('12 h')).toBeInTheDocument();
    expect(screen.getByText('Hours saved')).toBeInTheDocument();
    expect(document.querySelectorAll('dl')).toHaveLength(1);
  });
});
