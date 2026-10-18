import { describe, expect, it } from 'vitest';
import {
  type CapturedPage,
  decodeEntities,
  type MarkdownToken,
  pageToMarkdown,
  prefersMarkdown,
} from '@/lib/markdown';

function tokenize(html: string): MarkdownToken[] {
  return Array.from(
    html.matchAll(/<(\/)?([a-z][a-z0-9]*)([^>]*)>|([^<]+)/g),
    ([, closing, tag = '', attrs = '', text]): MarkdownToken => {
      if (text !== undefined) return { kind: 'text', text };
      if (closing) return { kind: 'close' };
      return {
        kind: 'open',
        tag,
        href: /href="([^"]*)"/.exec(attrs)?.[1] ?? null,
        hidden: attrs.includes('aria-hidden="true"'),
      };
    },
  );
}

function page(overrides: Partial<CapturedPage> = {}): CapturedPage {
  return {
    title: '',
    description: '',
    canonical: '',
    url: 'https://zenetlabs.com/',
    jsonLd: [],
    tokens: [],
    ...overrides,
  };
}

function render(html: string): string {
  return pageToMarkdown(page({ tokens: tokenize(html) }));
}

describe('prefersMarkdown', () => {
  it.each([
    [null, false],
    ['', false],
    ['text/markdown', true],
    ['text/markdown, text/html;q=0.9', true],
    ['text/*', true],
    ['*/*', false],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
    ['text/html, text/markdown', false],
    ['text/markdown, text/html', true],
    ['text/markdown;q=0', false],
    ['text/markdown;q=0.5, text/html', false],
    ['text/html;q=0.5, text/markdown;q=0.8', true],
    ['TEXT/Markdown', true],
    ['text/markdown;q=abc', false],
    ['application/json', false],
    ['text/markdown, */*;q=0.8', true],
    ['text/*;q=0.5, text/html', false],
  ])('%j gives %s', (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });
});

describe('decodeEntities', () => {
  it('decodes named and numeric entities and keeps unknown ones', () => {
    expect(decodeEntities('We don&#x27;t &amp; &lt;b&gt; &#169; &bogus;')).toBe(
      "We don't & <b> © &bogus;",
    );
  });

  it.each(['&#0;', '&#xD800;', '&#55357;', '&#x110000;', '&#99999999999;'])(
    'turns %s into the replacement character',
    (entity) => {
      expect(decodeEntities(entity)).toBe('\uFFFD');
    },
  );
});

describe('body conversion', () => {
  it.each([
    [
      'hero',
      '<section><div aria-hidden="true"></div><p>Eyebrow</p><h1>Turn into an <em>agentic company</em>.</h1><p>Lead</p><div><a href="/#contact">Start</a><a href="/#work">See →</a></div></section>',
      'Eyebrow\n\n# Turn into an *agentic company*.\n\nLead\n\n[Start](https://zenetlabs.com/#contact) [See →](https://zenetlabs.com/#work)\n',
    ],
    [
      'services with a container item and a tight list',
      '<ul><li><p>01</p><h3>Understand</h3><ul><li>A</li><li>B</li></ul></li></ul>',
      '01\n\n### Understand\n\n- A\n- B\n',
    ],
    [
      'block link with a heading',
      '<ul><li><a href="https://viatsy.com"><div><p>Travel · Group tours</p><span aria-hidden="true">↗</span></div><h3>Viatsy</h3><p>Small-group trips.</p><div><span aria-hidden="true">●</span>viatsy.com</div></a></li></ul>',
      'Travel · Group tours\n\n### [Viatsy](https://viatsy.com/)\n\nSmall-group trips.\n\nviatsy.com\n',
    ],
    [
      'block link without a heading',
      '<a href="mailto:a@b.c"><p>Write</p></a><p>After</p>',
      'Write\n\n[mailto:a@b.c](mailto:a@b.c)\n\nAfter\n',
    ],
    [
      'definition list',
      '<dl><div><dt>Splyt</dt><dd>Engineering.</dd></div></dl>',
      '**Splyt**\n\nEngineering.\n',
    ],
    [
      'skipped subtrees',
      '<p>Keep</p><form><label>Name</label><div><p>x</p></div></form><nav><a href="/">Nav</a></nav><div aria-hidden="true"><p>run</p></div><p>Also</p>',
      'Keep\n\nAlso\n',
    ],
    [
      'mailto links',
      '<p>Write to <a href="mailto:hello@zenetlabs.com">hello@zenetlabs.com</a></p>',
      'Write to [hello@zenetlabs.com](mailto:hello@zenetlabs.com)\n',
    ],
    [
      'a block link with an empty heading',
      '<a href="https://viatsy.com/x"><h3></h3><p>Text</p></a>',
      '### [viatsy.com](https://viatsy.com/x)\n\nText\n',
    ],
    [
      'urls with parentheses and spaces',
      '<p><a href="/a (b)/c d">Link</a></p>',
      '[Link](https://zenetlabs.com/a%20%28b%29/c%20d)\n',
    ],
    ['escaping', '<p>a*b_c [d] `e`</p>', 'a\\*b\\_c \\[d\\] \\`e\\`\n'],
  ])('converts %s', (_name, html, expected) => {
    expect(render(html)).toBe(expected);
  });
});

describe('pageToMarkdown', () => {
  const tokens = tokenize('<p>Body</p>');

  it('writes frontmatter and omits empty fields', () => {
    const out = pageToMarkdown(
      page({
        title: 'Zenet Labs',
        canonical: 'https://zenetlabs.com/',
        tokens,
      }),
    );
    expect(out).toBe(
      '---\ntitle: "Zenet Labs"\ncanonical: "https://zenetlabs.com/"\n---\n\nBody\n',
    );
  });

  it('resolves links against the page canonical', () => {
    const out = pageToMarkdown(
      page({
        canonical: 'https://zenetlabs.com/es',
        tokens: tokenize(
          '<p><a href="#contact">Go</a> <a href="docs/a">Doc</a></p>',
        ),
      }),
    );
    expect(out).toContain('[Go](https://zenetlabs.com/es#contact)');
    expect(out).toContain('[Doc](https://zenetlabs.com/docs/a)');
  });

  it('resolves links against the request url when there is no canonical', () => {
    const out = pageToMarkdown(
      page({
        url: 'http://localhost:4173/nope',
        tokens: tokenize('<p><a href="#x">Go</a></p>'),
      }),
    );
    expect(out).toContain('[Go](http://localhost:4173/nope#x)');
  });

  it('writes no frontmatter when every field is empty', () => {
    expect(render('<p>Body</p>')).toBe('Body\n');
  });

  it('writes one json fence per block', () => {
    const out = pageToMarkdown(
      page({ jsonLd: [' {"a":1} ', '', '{"b":2}'], tokens }),
    );
    expect(
      out.endsWith('```json\n{"a":1}\n```\n\n```json\n{"b":2}\n```\n'),
    ).toBe(true);
  });
});
