import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JOBS } from '@/components/switchboard-table';
import { PRIMARY_BUTTON } from '@/components/ui';
import { viatsy } from '@/content/es/cases';
import { locales } from '@/lib/i18n';
import { SERVICE_PAGE_IDS } from '@/lib/page-registry';
import { SERVICE_BODIES } from '../../test/service-bodies';

const CSS = readFileSync(
  join(process.cwd(), 'src', 'styles', 'app.css'),
  'utf8',
);

const INTRO = [
  'sb-out',
  'sb-dim',
  'sb-settle',
  'sb-agent',
  'sb-core',
  'sb-window',
  'sb-packet',
  'sb-ping',
  'sb-desk',
  'sb-rise',
  'sb-swap',
];

// The one gate every scene plays in: the home Switchboard and the inner boards
const SCENE_GATE =
  '@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {\n  [data-switchboard]';
const INTRO_SCOPE = '[data-switchboard]:not([data-intro="done"]) {';
const BOARD_SCOPE = '[data-flow-board] {';

function properties(block: string): string[] {
  return [
    ...new Set(
      [...block.matchAll(/([a-z-]+)\s*:(?!\s*[^;]*\{)/g)].map(
        (m) => m[1] ?? '',
      ),
    ),
  ];
}

// A sum of seconds, `var(--x)` resolved from `vars`
function evaluate(expression: string, vars: Record<string, number>): number {
  return [
    ...expression
      .replace(/var\((--[\w-]+)\)/g, (_, name: string) => `${vars[name]}s`)
      .matchAll(/([+-])?\s*([\d.]+)(m?s)\b/g),
  ].reduce(
    (sum, [, sign, value, unit]) =>
      sum +
      ((sign === '-' ? -1 : 1) * Number(value)) / (unit === 'ms' ? 1000 : 1),
    0,
  );
}

// The `--sb-*` beats on `.sb`, a later one may build on an earlier one
function introBeats(): Record<string, number> {
  const beats: Record<string, number> = {};
  for (const [, name = '', value = ''] of blockAfter('.sb {').matchAll(
    /(--sb-[\w-]+):\s*([^;]+);/g,
  )) {
    beats[name] = evaluate(value, beats);
  }
  return beats;
}

function flat(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// A CSS time expression (calc, min, max, + - * /, seconds, var(--x[, fallback]))
// evaluated for the variables in `env`, in seconds
function arithmetic(expression: string, env: Record<string, number>): number {
  const source = expression
    .replace(/var\((--[\w-]+)(?:,\s*[^)]*)?\)/g, (_, name: string) =>
      String(env[name]),
    )
    .replace(/(\d(?:\.\d+)?)ms\b/g, (_, n: string) => String(Number(n) / 1000))
    .replace(/(\d(?:\.\d+)?)s\b/g, '$1');
  const tokens = source.match(/min|max|[\d.]+|[-+*/(),]/g) ?? [];
  let at = 0;
  const peek = () => tokens[at];
  const take = () => tokens[at++];
  function primary(): number {
    const token = take();
    if (token === '(') {
      const value = sum();
      take();
      return value;
    }
    if (token === 'min' || token === 'max') {
      take();
      const values = [sum()];
      while (peek() === ',') {
        take();
        values.push(sum());
      }
      take();
      return token === 'min' ? Math.min(...values) : Math.max(...values);
    }
    if (token === '-') return -primary();
    return Number(token);
  }
  function product(): number {
    let value = primary();
    while (peek() === '*' || peek() === '/') {
      const op = take();
      const next = primary();
      value = op === '*' ? value * next : value / next;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const op = take();
      const next = product();
      value = op === '+' ? value + next : value - next;
    }
    return value;
  }
  return sum();
}

function blockAfter(marker: string, source = CSS): string {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${marker} is missing from app.css`);
  const open = source.indexOf('{', start);
  let depth = 1;
  let end = open + 1;
  while (depth > 0 && end < source.length) {
    if (source[end] === '{') depth += 1;
    if (source[end] === '}') depth -= 1;
    end += 1;
  }
  return source.slice(open + 1, end - 1);
}

describe('motion policy', () => {
  it('never scrolls smoothly', () => {
    expect(CSS).not.toMatch(/scroll-behavior:\s*smooth/);
  });

  it("pins the keyframes: the menu, the chat's typing dots, the switchboard intro and the launcher's scroll-linked hiding", () => {
    expect(
      [...CSS.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]),
    ).toEqual(['menu-in', 'chat-dot', ...INTRO, 'launcher-away']);
    const dots = blockAfter(
      '@media (prefers-reduced-motion: no-preference) {\n  .chat-dots',
    );
    expect(dots).toMatch(/\.chat-dots > span\s*\{[^}]*animation:\s*chat-dot/);
    expect(CSS.replace(dots, '')).not.toMatch(/animation:\s*chat-dot/);
    expect(blockAfter('@keyframes chat-dot')).not.toMatch(
      /(?<![-\w])(?!opacity|transform)[a-z-]+\s*:/,
    );
    const gated = blockAfter(
      '@media (prefers-reduced-motion: no-preference) {\n  details[open] > .menu-panel',
    );
    expect(gated).toMatch(
      /details\[open\] > \.menu-panel\s*\{[^}]*animation:\s*menu-in/,
    );
    expect(CSS.replace(gated, '')).not.toMatch(/animation:\s*menu-in/);
    expect(blockAfter('@keyframes menu-in')).not.toMatch(/\bto\s*\{|100%/);
    const away = blockAfter('@keyframes launcher-away');
    expect(properties(away)).toEqual(['visibility']);
  });

  it('plays every scene in one gate: scripting and motion allowed, the Switchboard until it is done', () => {
    const gate = blockAfter(SCENE_GATE);
    expect(CSS.split(SCENE_GATE)).toHaveLength(2);
    expect(gate).toContain(INTRO_SCOPE);
    expect(gate).toContain(BOARD_SCOPE);
    const intro = blockAfter(INTRO_SCOPE);
    const outside = CSS.replace(gate, '');
    for (const name of INTRO) {
      expect(intro).toMatch(new RegExp(`animation:\\s*${name}\\s`));
      expect(outside).not.toMatch(
        new RegExp(`animation(-name)?:\\s*${name}\\b`),
      );
    }
    expect(gate).not.toMatch(/infinite/);
    expect(gate).not.toMatch(/forwards|both/);
  });

  it('keeps every scene animation inside that gate, and the boards on three of the Switchboard keyframes', () => {
    const gate = blockAfter(SCENE_GATE);
    const outside = CSS.replace(gate, '');
    const scenes = [...CSS.matchAll(/animation(?:-name)?:\s*(sb-[\w-]+)/g)];
    expect(scenes.length).toBeGreaterThan(0);
    expect(outside).not.toMatch(/animation(-name)?:\s*sb-/);
    const board = blockAfter(BOARD_SCOPE);
    const names = [...board.matchAll(/animation:\s*([\w-]+)/g)].map(
      (m) => m[1],
    );
    expect(new Set(names)).toEqual(
      new Set(['sb-packet', 'sb-ping', 'sb-rise']),
    );
    expect(outside).not.toMatch(/\.fb-[\w-]+[^{}]*\{[^}]*animation/);
  });

  it('moves the intro only by opacity and transforms, with visibility to hide the desk and swap the button label', () => {
    for (const name of INTRO) {
      const allowed = [
        'opacity',
        'transform',
        'translate',
        'scale',
        'animation-timing-function',
      ];
      if (['sb-desk', 'sb-swap'].includes(name)) allowed.push('visibility');
      for (const property of properties(blockAfter(`@keyframes ${name} `))) {
        expect(allowed, `${name} ${property}`).toContain(property);
      }
    }
  });

  it("derives the tiles' light stops from the beats", () => {
    const beats = introBeats();
    const j1 = beats['--sb-j1'] ?? 0;
    const span = (beats['--sb-h'] ?? 0) + 0.6 - j1;
    const at = (seconds: number) => (100 * (seconds - j1)) / span;
    const fade = 0.15;
    const expected = [
      at(j1 + 0.3),
      at((beats['--sb-j2'] ?? 0) - fade),
      at((beats['--sb-j2'] ?? 0) + fade),
      at((beats['--sb-j3'] ?? 0) - fade),
      at((beats['--sb-j3'] ?? 0) + fade),
      at(beats['--sb-h'] ?? 0),
    ];
    const stops = [
      ...blockAfter('@keyframes sb-dim ').matchAll(/([\d.]+)%/g),
    ].map(([, value]) => Number(value));
    expect(stops).toHaveLength(expected.length);
    for (const [index, stop] of stops.entries()) {
      expect(stop).toBeCloseTo(expected[index] ?? 0, 1);
    }
  });

  it('ends the intro within 11 seconds', () => {
    const beats: Record<string, number> = {
      ...introBeats(),
      '--rise': 0.28,
    };
    const seconds = (expression: string) => evaluate(expression, beats);
    const jobs = [
      ...CSS.matchAll(/\.sb-job\[data-job="\w+"\]\s*\{([^}]*)\}/g),
    ].map(
      ([, rule = '']) =>
        seconds(/--at:\s*([^;]+);/.exec(rule)?.[1] ?? '') +
        seconds(/--span:\s*([^;]+);/.exec(rule)?.[1] ?? ''),
    );
    const hops = JOBS.flatMap((job, beat) =>
      job.hops.map(
        ([, , at]) =>
          (beats[`--sb-j${beat + 1}`] ?? Number.NaN) + at + 0.9 + 0.7,
      ),
    );
    const rest = [
      ...blockAfter(INTRO_SCOPE).matchAll(/animation:\s*sb-[\w-]+([^;]*);/g),
    ]
      .map(([, timing = '']) => timing)
      .filter((timing) => !/--(at|span|d)\b/.test(timing))
      .map(seconds);
    expect(jobs).toHaveLength(3);
    expect(hops).toHaveLength(10);
    expect(rest.length).toBeGreaterThan(8);
    expect(Math.max(...jobs, ...hops, ...rest)).toBeLessThanOrEqual(11);
  });

  it('ends every board within 5 seconds, for each step count, from the CSS declarations', () => {
    const board = flat(blockAfter('.flow-board {'));
    const sceneRaw = blockAfter(BOARD_SCOPE);
    const scene = flat(sceneRaw);
    const beats = (steps: number) => {
      const values: Record<string, number> = {};
      const env: Record<string, number> = { '--n': steps };
      for (const [, name = '', value = ''] of board.matchAll(
        /(--fb-[\w-]+):\s*([^;]+);/g,
      )) {
        env[name] = arithmetic(value, env);
        values[name] = env[name] ?? 0;
      }
      return env;
    };
    const timing = (selector: string) => {
      const rule = flat(blockAfter(`${selector} {`, sceneRaw));
      const match =
        /animation:\s*(sb-[\w-]+)\s+(\S+)\s+(?:linear|var\(--ease-out\))\s+(.+?)(?:\s+backwards)?;/.exec(
          rule,
        );
      if (!match) throw new Error(`no animation on ${selector}`);
      return { duration: match[2] ?? '', delay: match[3] ?? '' };
    };
    const first = /animation-delay:\s*([^;]+);/.exec(
      flat(blockAfter('.fb-lane li:first-child .fb-ping {', sceneRaw)),
    );
    expect(scene).toContain('.fb-lane li:first-child .fb-ping');
    const [packet, ping, after, pairPacket, pairPing] = [
      timing('.fb-lane .fb-pk'),
      timing('.fb-lane .fb-ping'),
      timing('.fb-after'),
      timing('.fb-pair .fb-pk'),
      timing('.fb-pair .fb-ping'),
    ];
    const end = (
      t: { duration: string; delay: string },
      env: Record<string, number>,
    ) => arithmetic(t.delay, env) + arithmetic(t.duration, env);
    const laneEnd = (steps: number) => {
      const env = beats(steps);
      const ends = [end(after, env)];
      for (let i = 0; i < steps; i += 1) {
        const at = { ...env, '--i': i };
        const delay =
          i === 0
            ? arithmetic(first?.[1] ?? '', at)
            : arithmetic(ping.delay, at);
        ends.push(delay + arithmetic(ping.duration, at));
        if (i < steps - 1) ends.push(end(packet, at));
        if (i === 0) {
          expect(delay, `${steps} steps: the first ping`).toBeLessThanOrEqual(
            arithmetic(packet.delay, at),
          );
        }
      }
      return Math.max(...ends);
    };
    const flows = [
      ...locales.flatMap((locale) =>
        SERVICE_PAGE_IDS.map((page) => SERVICE_BODIES[locale].pages[page].flow),
      ),
      viatsy.flow,
    ];
    const longest = Math.max(...flows.map((flow) => flow?.steps.length ?? 0));
    expect(longest).toBeGreaterThanOrEqual(3);
    expect(laneEnd(longest)).toBeLessThanOrEqual(5);
    expect(laneEnd(3)).toBeGreaterThan(3);
    for (let steps = 2; steps <= 24; steps += 1) {
      expect(laneEnd(steps), `${steps} steps`).toBeLessThanOrEqual(5);
    }
    const env = beats(3);
    const pairEnd = Math.max(
      ...[0, 1, 2, 3].flatMap((k) => [
        end(pairPacket, { ...env, '--k': k }),
        end(pairPing, { ...env, '--k': k }),
      ]),
    );
    expect(pairEnd).toBeLessThanOrEqual(5);
    expect(pairEnd).toBeGreaterThan(3);
  });

  it('removes keyframes but adds no blanket transition under reduced motion', () => {
    const reduced = blockAfter('@media (prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/animation:\s*none/);
    expect(reduced).not.toMatch(/transition/);
    expect(reduced).not.toMatch(/transform/);
  });

  it('keeps button colour changes under reduced motion and gates the press scale', () => {
    expect(PRIMARY_BUTTON).toMatch(
      /(?<!motion-safe:)transition-\[background-color,border-color,color\]/,
    );
    expect(PRIMARY_BUTTON).toContain('motion-safe:active:scale-[0.97]');
    expect(PRIMARY_BUTTON).toContain(
      'motion-safe:transition-[background-color,border-color,color,scale]',
    );
    expect(PRIMARY_BUTTON).not.toMatch(/(?<!motion-safe:)active:scale/);
  });

  it('uses the Emil ease-out curve and never an ease-in', () => {
    expect(CSS).toContain('--ease-out: cubic-bezier(0.23, 1, 0.32, 1)');
    expect(CSS).not.toMatch(/ease-in(?!-out)/);
  });

  it('keeps press and hover feedback under 300ms', () => {
    for (const [, value] of CSS.matchAll(/--duration-[\w-]+:\s*(\d+)ms/g)) {
      expect(Number(value)).toBeLessThan(300);
    }
  });

  it('gates hover effects behind a fine pointer', () => {
    expect(PRIMARY_BUTTON).not.toMatch(/(?<!pointer-fine:)hover:/);
  });
});
