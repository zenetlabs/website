import { afterEach, describe, expect, it } from 'vitest';
import { consentDefaultsScripts } from '@/lib/consent-defaults';

describe('consentDefaultsScripts', () => {
  it('emits one inline script with the four signals denied and nothing else', () => {
    const scripts = consentDefaultsScripts();
    expect(scripts).toHaveLength(1);
    const code = scripts[0]?.children ?? '';
    for (const signal of [
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
      'analytics_storage',
    ]) {
      expect(code).toContain(`${signal}:'denied'`);
    }
    expect(code).not.toContain('granted');
    expect(code).toContain('function gtag(){dataLayer.push(arguments);}');
    expect(code).not.toContain('gtag/js');
    expect(code).not.toMatch(/G-[A-Z0-9]{4,}/);
    expect(code).not.toContain('<');
  });

  describe('when evaluated', () => {
    afterEach(() => {
      window.dataLayer = undefined;
    });

    it('queues an Arguments object, which gtag.js requires, never an array', () => {
      window.dataLayer = undefined;
      const code = consentDefaultsScripts()[0]?.children ?? '';
      new Function(code)();
      const first = window.dataLayer?.[0];
      expect(Array.isArray(first)).toBe(false);
      expect(Object.prototype.toString.call(first)).toBe('[object Arguments]');
      expect(typeof first).toBe('object');
      expect(Object.values(first ?? {})).toEqual([
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ]);
    });
  });
});
