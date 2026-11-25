import { describe, expect, it } from 'vitest';
import type { Metric } from '@/content/types';
import { isMeasured, metricFigure, metricText } from '@/lib/metrics';

const BASE = { id: 'm', label: 'Label', value: 40, unit: '' } satisfies Metric;
const HOURS = { ...BASE, value: 8, unit: ' h' } satisfies Metric;

describe('metricFigure', () => {
  it('is the bare figure and its unit without a qualifier', () => {
    expect(metricFigure('en', HOURS)).toBe('8 h');
    expect(metricFigure('es', BASE)).toBe('40');
  });

  it.each([
    ['en', 'about', 'about 40'],
    ['es', 'unos', 'unos 40'],
  ] as const)('puts the approx word first (%s)', (locale, approx, text) => {
    expect(metricFigure(locale, { ...BASE, approx })).toBe(text);
  });

  it('leaves the estimate out of the figure', () => {
    expect(metricFigure('en', { ...HOURS, estimate: 'estimated' })).toBe('8 h');
  });
});

describe('metricText', () => {
  it.each([
    ['en', 'estimated', '8 h (estimated)'],
    ['es', 'estimación', '8 h (estimación)'],
  ] as const)(
    'marks an estimate in brackets (%s)',
    (locale, estimate, text) => {
      expect(metricText(locale, { ...HOURS, estimate })).toBe(text);
    },
  );

  it('keeps the approx word, with no brackets', () => {
    expect(metricText('en', { ...BASE, approx: 'about' })).toBe('about 40');
    expect(metricText('es', { ...BASE, approx: 'unos' })).toBe('unos 40');
  });

  it('carries both together', () => {
    expect(
      metricText('en', { ...HOURS, approx: 'about', estimate: 'estimated' }),
    ).toBe('about 8 h (estimated)');
  });

  it('formats thousands for the locale', () => {
    expect(metricText('es', { ...BASE, value: 12000 })).toBe('12.000');
  });
});

describe('isMeasured', () => {
  it('is false for a null value only', () => {
    expect(isMeasured({ ...BASE, value: null })).toBe(false);
    expect(isMeasured({ ...BASE, value: 0 })).toBe(true);
  });
});
