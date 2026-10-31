import { CONSENT_KEY, COOKIE_CONSENT_REVISION } from '../src/lib/consent';

export function rejectedConsent(baseURL: string) {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseURL).origin,
        localStorage: [
          {
            name: CONSENT_KEY,
            value: JSON.stringify({
              analytics: false,
              marketing: false,
              revision: COOKIE_CONSENT_REVISION,
              at: Date.now(),
            }),
          },
        ],
      },
    ],
  };
}
