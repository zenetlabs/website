import { describe, expect, it } from 'vitest';
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
});
