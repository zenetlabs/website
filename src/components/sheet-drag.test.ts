import { describe, expect, it } from 'vitest';
import {
  closeDuration,
  dragOffset,
  releaseOutcome,
  releaseVelocity,
  resist,
} from '@/components/sheet-drag';

const height = 800;

describe('releaseOutcome', () => {
  it('closes past a quarter of the sheet and springs back at or below it', () => {
    expect(releaseOutcome({ travel: 201, velocity: 0, height })).toBe('close');
    expect(releaseOutcome({ travel: 200, velocity: 0, height })).toBe('return');
    expect(releaseOutcome({ travel: 80, velocity: 0.2, height })).toBe(
      'return',
    );
  });

  it('closes on a fast downward flick, however short', () => {
    expect(releaseOutcome({ travel: 12, velocity: 0.51, height })).toBe(
      'close',
    );
    expect(releaseOutcome({ travel: 12, velocity: 0.5, height })).toBe(
      'return',
    );
  });

  it('keeps the sheet when the finger throws it back up, even past a quarter', () => {
    expect(releaseOutcome({ travel: 400, velocity: -0.5, height })).toBe(
      'return',
    );
    expect(releaseOutcome({ travel: 400, velocity: -0.49, height })).toBe(
      'close',
    );
  });
});

describe('dragOffset', () => {
  it('follows the finger 1:1 downward', () => {
    expect(dragOffset(0, 150, false)).toBe(150);
    expect(dragOffset(300, -100, false)).toBe(200);
  });

  it('gives a fifth of the travel upward at first, and never more than 24px', () => {
    expect(dragOffset(0, -5, false)).toBeCloseTo(-1, 1);
    expect(dragOffset(0, -60, false)).toBeCloseTo(-8);
    expect(dragOffset(0, -5000, false)).toBeGreaterThan(-24);
    expect(resist(0)).toBe(0);
  });

  it('only rubber-bands a held sheet, in both directions', () => {
    expect(dragOffset(0, 500, true)).toBeGreaterThan(19);
    expect(dragOffset(0, 500, true)).toBeLessThan(24);
    expect(dragOffset(0, -500, true)).toBe(-dragOffset(0, 500, true));
  });

  it('rebases without a jump when the hold changes mid-drag', () => {
    expect(dragOffset(300, 0, true)).toBe(300);
    expect(dragOffset(300, 400, true)).toBeLessThan(324);
    expect(dragOffset(12, 0, false)).toBe(12);
  });
});

describe('releaseVelocity', () => {
  it('measures the last 100ms only', () => {
    const samples = [
      { t: 0, y: 0 },
      { t: 200, y: 10 },
      { t: 250, y: 30 },
      { t: 300, y: 70 },
    ];
    expect(releaseVelocity(samples)).toBeCloseTo(60 / 100);
  });

  it('is zero when the finger rested before letting go, or never moved', () => {
    expect(
      releaseVelocity([
        { t: 0, y: 0 },
        { t: 50, y: 300 },
        { t: 400, y: 300 },
      ]),
    ).toBe(0);
    expect(releaseVelocity([{ t: 10, y: 5 }])).toBe(0);
    expect(releaseVelocity([])).toBe(0);
  });
});

describe('closeDuration', () => {
  it('stays within 120 to 240ms', () => {
    expect(closeDuration(600, 0)).toBe(240);
    expect(closeDuration(600, 0.3)).toBe(240);
    expect(closeDuration(40, 4)).toBe(120);
  });

  it('matches the finger speed in between', () => {
    expect(closeDuration(200, 2.25)).toBe(200);
  });
});
