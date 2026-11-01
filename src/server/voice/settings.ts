import { MINUTE_MS } from '@/lib/time';

// TODO(albert): review the call length, the model, the voices and the retention
export const VOICE_SETTINGS = {
  maxCallSeconds: 300,
  silenceEndSeconds: 20,
  sessionWindowMs: 15 * MINUTE_MS,
  toolCallsPerSession: 40,
  bookAttemptsPerSession: 3,
  // A booking that never reported back (the Worker died) stops blocking after this.
  bookingStaleMs: MINUTE_MS,
  llm: 'glm-52',
  ttsModel: { en: 'eleven_flash_v2', es: 'eleven_flash_v2_5' },
  // null leaves ElevenLabs' default voice for the language
  voices: { en: null, es: null },
  retentionDays: 30,
  concurrency: 2,
  asrKeywords: [
    'Zenet Labs',
    'Holded',
    'Verifactu',
    'HubSpot',
    'Shopify',
    'Xero',
    'PrestaShop',
    'WooCommerce',
  ],
} as const;
