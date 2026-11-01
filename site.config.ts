export type SiteConfig = {
  url: string;
  turnstileSiteKey: string;
  cfBeaconToken: string;
  ga4Id: string | null;
  calculator: { published: boolean };
  booking: { published: boolean };
  assistant: { published: boolean };
};

const local: SiteConfig = {
  url: 'http://localhost:4173',
  turnstileSiteKey: '1x00000000000000000000AA',
  cfBeaconToken: '',
  ga4Id: 'G-LOCALTEST00',
  calculator: { published: true },
  booking: { published: true },
  assistant: { published: true },
};

const production: SiteConfig = {
  url: 'https://zenetlabs.com',
  turnstileSiteKey: '0x4AAAAAAFZQKfItYauQvdOW',
  cfBeaconToken: '7a7e520c91144021814e8063da778c05',
  // TODO(albert): GA4 web-stream measurement ID (G-XXXXXXXXXX); follow docs/analytics.md "Activation"
  ga4Id: null,
  // TODO(albert): set true after reviewing src/content/pricing-rules.ts
  calculator: { published: false },
  // TODO(albert): set true once the Google Calendar secret exists and /api/health reports booking:true (docs/ai-assistant.md "Booking activation")
  booking: { published: false },
  // TODO(albert): set true after the model bake-off passes (docs/ai-assistant.md "Activation")
  assistant: { published: false },
};

export function siteConfig(env: string | undefined): SiteConfig {
  if (!env) return local;
  if (env === 'production') return production;
  throw new Error(`Unknown CLOUDFLARE_ENV: ${env}`);
}

export type AccessConfig = { teamDomain: string; aud: string };

export type BookingServerConfig = {
  tokenUrl: string;
  calendarUrl: string;
  busyCacheMs: number;
  failureCacheMs: number;
};

export type ChatModelId =
  | '@cf/zai-org/glm-4.7-flash'
  | '@cf/google/gemma-4-26b-a4b-it'
  | '@cf/meta/llama-4-scout-17b-16e-instruct';

export type AssistantServerConfig = {
  model: ChatModelId | 'fake';
  aiGatewayName: string | null;
  dailyNeuronBudget: number;
  perAddressDailyTurns: number;
};

export type ServerConfig = {
  leads: { notifyTo: string };
  resendBaseUrl: string;
  access: AccessConfig | null;
  booking: BookingServerConfig;
  assistant: AssistantServerConfig;
};

const localServer: ServerConfig = {
  leads: { notifyTo: 'owner-alerts@example.com' },
  resendBaseUrl: 'http://127.0.0.1:4175',
  access: { teamDomain: 'http://127.0.0.1:4175', aud: 'local-access-aud' },
  booking: {
    tokenUrl: 'http://127.0.0.1:4175/__google/token',
    calendarUrl: 'http://127.0.0.1:4175/__google/calendar/v3',
    busyCacheMs: 0,
    failureCacheMs: 0,
  },
  assistant: {
    model: 'fake',
    aiGatewayName: null,
    dailyNeuronBudget: 1_000_000,
    perAddressDailyTurns: 100_000,
  },
};

const productionServer: ServerConfig = {
  // TODO(albert): confirm the lead notification address
  leads: { notifyTo: 'admin@zenetlabs.com' },
  resendBaseUrl: 'https://api.resend.com',
  // TODO(albert): set { teamDomain: 'https://<team>.cloudflareaccess.com', aud } once the Access app exists
  access: null,
  booking: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    calendarUrl: 'https://www.googleapis.com/calendar/v3',
    busyCacheMs: 60_000,
    failureCacheMs: 45_000,
  },
  assistant: {
    // TODO(albert): confirm the model after the bake-off (pnpm eval:chat against a preview alias)
    model: '@cf/zai-org/glm-4.7-flash',
    // TODO(albert): AI Gateway name (docs/ai-assistant.md "AI Gateway"); null calls Workers AI directly
    aiGatewayName: null,
    // TODO(albert): raise on Workers Paid; the Free plan stops at 10,000 neurons a day for the whole account
    dailyNeuronBudget: 8_000,
    // Two full 20-message sessions a day from one address; the same limit for every visitor behind a shared one.
    perAddressDailyTurns: 40,
  },
};

export function serverConfig(env: string | undefined): ServerConfig {
  if (!env) return localServer;
  if (env === 'production') return productionServer;
  throw new Error(`Unknown CLOUDFLARE_ENV: ${env}`);
}
