import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import type { ProjectType } from '@/lib/calculator-answers';
import { type CtaId, type LeadMethod, track } from '@/lib/track';

let calls: unknown[][];

beforeEach(() => {
  calls = [];
  window.gtag = (...args: unknown[]) => {
    calls.push(args);
  };
  vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
});

afterEach(() => {
  window.gtag = undefined;
  window.zenetTracking = undefined;
  vi.unstubAllGlobals();
});

describe('track', () => {
  it('is a no-op until analytics consent has switched tracking on', () => {
    track('language_switch');
    window.zenetTracking = false;
    track('language_switch');
    expect(calls).toEqual([]);
  });

  it('is a no-op when analytics is not configured, even if the flag is set', () => {
    vi.stubGlobal('__GA4_ID__', null);
    window.zenetTracking = true;
    track('language_switch');
    expect(calls).toEqual([]);
  });

  it('is a no-op without gtag', () => {
    window.zenetTracking = true;
    window.gtag = undefined;
    expect(() => track('language_switch')).not.toThrow();
  });

  it('pushes the event with its params once tracking is on', () => {
    window.zenetTracking = true;
    track('cta_click', { cta_id: 'hero' });
    track('pricing_view');
    expect(calls).toEqual([
      ['event', 'cta_click', { cta_id: 'hero' }],
      ['event', 'pricing_view', undefined],
    ]);
  });

  it('only accepts the documented params', () => {
    expectTypeOf(track<'cta_click'>).parameters.toEqualTypeOf<
      ['cta_click', { cta_id: CtaId }]
    >();
    expectTypeOf(track<'generate_lead'>).parameters.toEqualTypeOf<
      ['generate_lead', { method: LeadMethod }]
    >();
    expectTypeOf(track<'calculator_complete'>).parameters.toEqualTypeOf<
      ['calculator_complete', { project_type: ProjectType }]
    >();
    expectTypeOf(track).toBeCallableWith('pricing_view');
  });
});
