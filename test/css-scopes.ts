export type Scope = 'light' | 'dark' | 'bandLight' | 'bandDark';
export type Tokens = Record<string, string>;
type Block = { selector: string; dark: boolean; body: string };

function walk(source: string, dark: boolean, out: Block[]) {
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
      walk(body, dark || head.includes('prefers-color-scheme: dark'), out);
    } else {
      out.push({ selector: head, dark, body });
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
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), false, blocks);
  const merged = (match: (block: Block) => boolean): Tokens =>
    Object.fromEntries(
      blocks
        .filter(match)
        .flatMap((block) => Object.entries(declared(block.body))),
    );
  const root = (block: Block, dark: boolean) =>
    block.selector.includes(':root') && block.dark === dark;
  const band = (block: Block, dark: boolean) =>
    block.selector === '.band' && block.dark === dark;
  const light = merged((block) => root(block, false));
  const dark = { ...light, ...merged((block) => root(block, true)) };
  const bandLight = { ...light, ...merged((block) => band(block, false)) };
  const bandDark = {
    ...dark,
    ...merged((block) => band(block, false)),
    ...merged((block) => band(block, true)),
  };
  return {
    light: resolved(light),
    dark: resolved(dark),
    bandLight: resolved(bandLight),
    bandDark: resolved(bandDark),
  };
}
