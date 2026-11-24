import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANGLES,
  type End,
  JOBS,
  jobTiles,
} from '@/components/switchboard-table';

// The switchboard's choreography lives in app.css; this holds it to the table
const CSS = readFileSync(
  join(process.cwd(), 'src', 'styles', 'app.css'),
  'utf8',
);

// The body of the rule for `selector` that declares `name`
function rule(selector: string, name = ''): string {
  let start = CSS.indexOf(`${selector} {`);
  while (start >= 0) {
    const body = CSS.slice(start, CSS.indexOf('}', start));
    if (body.includes(name)) return body;
    start = CSS.indexOf(`${selector} {`, start + 1);
  }
  throw new Error(`${selector} is missing from app.css`);
}

function value(body: string, name: string): string | undefined {
  return new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1]?.trim();
}

function angleOf(body: string, name: string, fallback: string) {
  return value(body, name) ?? fallback;
}

describe('the switchboard CSS follows its table', () => {
  it('puts every tile at its angle', () => {
    const ring = rule('\n  .sb-orbit', '--a-shopify');
    for (const [tile, degrees] of Object.entries(ANGLES)) {
      expect(value(ring, `--a-${tile}`), tile).toBe(`${degrees}deg`);
      expect(value(rule(`.sb-orbit [data-tile="${tile}"]`), '--a')).toBe(
        `var(--a-${tile})`,
      );
    }
  });

  it("lights each tile in its jobs' turns only", () => {
    for (const tile of Object.keys(ANGLES)) {
      const node = rule(`.sb-node[data-tile="${tile}"]`);
      JOBS.forEach((job, index) => {
        const lit = jobTiles(job).some((used) => used === tile);
        expect(value(node, `--o${index + 1}`), `${tile} ${job.id}`).toBe(
          lit ? '1' : undefined,
        );
      });
    }
  });

  it("runs every hop in the table's order, route and time", () => {
    const base = rule('\n  .sb-hop', '--k0');
    const shared = (index: number) =>
      [...CSS.matchAll(/\.sb-hop:nth-child\(-n \+ (\d+)\)\s*\{([^}]*)\}/g)]
        .filter(([, count]) => index <= Number(count))
        .map(([, , body = '']) => body)
        .join('');
    const at = (end: End) =>
      end === 'core' ? ['0', '0deg'] : ['1', `var(--a-${end})`];
    let index = 0;
    JOBS.forEach((job, beat) => {
      for (const [from, to, seconds] of job.hops) {
        index += 1;
        const body = shared(index) + rule(`.sb-hop:nth-child(${index})`);
        const [k0, a0] = at(from);
        const [k1, a1] = at(to);
        const k = (name: string) => value(body, name) ?? value(base, name);
        expect(k('--k0'), `hop ${index}`).toBe(k0);
        expect(k('--k1'), `hop ${index}`).toBe(k1);
        if (k0 === '1') expect(angleOf(body, '--a0', '')).toBe(a0);
        if (k1 === '1') expect(angleOf(body, '--a1', '')).toBe(a1);
        expect(value(body, '--at'), `hop ${index}`).toBe(
          `calc(var(--sb-j${beat + 1}) + ${seconds}s)`,
        );
      }
    });
    expect(CSS).not.toContain(`.sb-hop:nth-child(${index + 1})`);
  });

  it('runs orders tool to tool, the only path that skips the core', () => {
    const direct = JOBS.flatMap((job) =>
      job.hops.filter((hop) => !hop.includes('core')),
    );
    for (const [from, to] of direct) {
      const line = rule(`.sb-lit[data-tile="${from}"][data-to="${to}"]`);
      expect(value(line, '--a0')).toBe(`var(--a-${from})`);
      expect(value(line, '--a')).toBe(`var(--a-${to})`);
    }
  });
});
