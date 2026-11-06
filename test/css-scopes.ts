export type Scope = 'light' | 'band';
export type Tokens = Record<string, string>;
type Block = { selector: string; body: string };

function walk(source: string, out: Block[]) {
  let position = 0;
  while (position < source.length) {
    const open = source.indexOf('{', position);
    if (open < 0) return;
    const head = source.slice(position, open).trim();
    let depth = 1;
    let end = open + 1;
    while (depth > 0 && end < source.length) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}') depth -= 1;
      end += 1;
    }
    const body = source.slice(open + 1, end - 1);
    if (head.startsWith('@media')) {
      walk(body, out);
    } else {
      out.push({ selector: head, body });
    }
    position = end;
  }
}

function declared(body: string): Tokens {
  return Object.fromEntries(
    [
      ...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6}|var\(--[\w-]+\))/g),
    ].flatMap(([, name, value]) => (name && value ? [[name, value]] : [])),
  );
}

function resolved(tokens: Tokens): Tokens {
  const lookup = (value: string): string => {
    const name = /^var\(--([\w-]+)\)$/.exec(value)?.[1];
    if (!name) return value;
    const next = tokens[name];
    return next ? lookup(next) : value;
  };
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [name, lookup(value)]),
  );
}

export function scopes(css: string): Record<Scope, Tokens> {
  const blocks: Block[] = [];
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), blocks);
  const merged = (match: (block: Block) => boolean): Tokens =>
    Object.fromEntries(
      blocks
        .filter(match)
        .flatMap((block) => Object.entries(declared(block.body))),
    );
  const light = merged((block) => block.selector.includes(':root'));
  const band = { ...light, ...merged((block) => block.selector === '.band') };
  return { light: resolved(light), band: resolved(band) };
}

function propertyNames(css: string, match: (block: Block) => boolean) {
  const blocks: Block[] = [];
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), blocks);
  return new Set(
    blocks
      .filter(match)
      .flatMap((block) =>
        [...block.body.matchAll(/(--[\w-]+)\s*:/g)].flatMap(([, name]) =>
          name ? [name] : [],
        ),
      ),
  );
}

export function bandPropertyNames(css: string): Set<string> {
  return propertyNames(css, (block) => block.selector === '.band');
}

export function pagePropertyNames(css: string): Set<string> {
  return propertyNames(css, (block) => block.selector.includes('.scope-page'));
}
