import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const STATIC_IMPORT = /(?:from|import)\s*"\.\/([^"]+\.js)"/g;

// TanStack Start preloads a route's own chunks only, and the build adds no
// modulepreload of its own, so a chunk those import is fetched only once its
// importer has run: a waterfall before hydration. This walks the static
// imports of every route's preloads and lists the whole set in the manifest.
export function expandPreloads(): Plugin {
  return {
    name: 'expand-route-preloads',
    apply: 'build',
    writeBundle(options) {
      if (this.environment.name !== 'ssr' || !options.dir) return;
      const assets = join(options.dir, 'assets');
      const manifest = readdirSync(assets).find((name) =>
        name.startsWith('_tanstack-start-manifest'),
      );
      if (!manifest) return;
      const client = resolve(options.dir, '..', 'client', 'assets');
      const imports = new Map<string, string[]>();
      const importsOf = (name: string): string[] => {
        const known = imports.get(name);
        if (known) return known;
        const text = readFileSync(join(client, name), 'utf8');
        const found = [...text.matchAll(STATIC_IMPORT)].flatMap((match) =>
          match[1] ? [match[1]] : [],
        );
        imports.set(name, found);
        return found;
      };
      const closure = (start: readonly string[]): string[] => {
        const seen = new Set(start);
        for (const name of seen) {
          for (const next of importsOf(name)) seen.add(next);
        }
        return [...seen];
      };
      const path = join(assets, manifest);
      const text = readFileSync(path, 'utf8');
      const expanded = text.replace(
        /preloads: \[([^\]]*)\]/g,
        (_, list: string) => {
          const names = [...list.matchAll(/"\/assets\/([^"]+)"/g)].flatMap(
            (match) => (match[1] ? [match[1]] : []),
          );
          const all = closure(names).map((name) => `"/assets/${name}"`);
          return `preloads: [${all.join(', ')}]`;
        },
      );
      writeFileSync(path, expanded);
    },
  };
}
