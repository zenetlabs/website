import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JOBS } from '@/components/switchboard-table';
import { PRIMARY_BUTTON } from '@/components/ui';

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

const INTRO_GATE =
  '@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {\n  [data-switchboard]';
const INTRO_SCOPE = '[data-switchboard]:not([data-intro="done"]) {';

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

function blockAfter(marker: string): string {
  const start = CSS.indexOf(marker);
  if (start < 0) throw new Error(`${marker} is missing from app.css`);
  const open = CSS.indexOf('{', start);
  let depth = 1;
  let end = open + 1;
  while (depth > 0 && end < CSS.length) {
    if (CSS[end] === '{') depth += 1;
    if (CSS[end] === '}') depth -= 1;
    end += 1;
  }
  return CSS.slice(open + 1, end - 1);
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

  it('plays the switchboard intro only with scripting and motion allowed, until it is done', () => {
    const block = blockAfter(INTRO_GATE);
    expect(CSS.split(INTRO_GATE)).toHaveLength(2);
    expect(block.trim().startsWith(INTRO_SCOPE)).toBe(true);
    expect(block.trim().length).toBe(
      blockAfter(INTRO_SCOPE).length + INTRO_SCOPE.length + 1,
    );
    const outside = CSS.replace(block, '');
    for (const name of INTRO) {
      expect(block).toMatch(new RegExp(`animation:\\s*${name}\\s`));
      expect(outside).not.toMatch(
        new RegExp(`animation(-name)?:\\s*${name}\\b`),
      );
    }
    expect(block).not.toMatch(/infinite/);
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
      ...blockAfter(INTRO_GATE).matchAll(/animation:\s*sb-[\w-]+([^;]*);/g),
    ]
      .map(([, timing = '']) => timing)
      .filter((timing) => !/--(at|span|d)\b/.test(timing))
      .map(seconds);
    expect(jobs).toHaveLength(3);
    expect(hops).toHaveLength(10);
    expect(rest.length).toBeGreaterThan(8);
    expect(Math.max(...jobs, ...hops, ...rest)).toBeLessThanOrEqual(11);
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
