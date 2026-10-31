export type SiteConfig = {
  url: string;
  turnstileSiteKey: string;
  cfBeaconToken: string;
};

const local: SiteConfig = {
  url: 'http://localhost:4173',
  turnstileSiteKey: '1x00000000000000000000AA',
  cfBeaconToken: '',
};

const production: SiteConfig = {
  url: 'https://zenetlabs.com',
  turnstileSiteKey: '0x4AAAAAAFZQKfItYauQvdOW',
  cfBeaconToken: '7a7e520c91144021814e8063da778c05',
};

export function siteConfig(env: string | undefined): SiteConfig {
  if (!env) return local;
  if (env === 'production') return production;
  throw new Error(`Unknown CLOUDFLARE_ENV: ${env}`);
}

export type AccessConfig = { teamDomain: string; aud: string };

export type ServerConfig = {
  leads: { notifyTo: string };
  resendBaseUrl: string;
  access: AccessConfig | null;
};

const localServer: ServerConfig = {
  leads: { notifyTo: 'owner-alerts@example.com' },
  resendBaseUrl: 'http://127.0.0.1:4175',
  access: { teamDomain: 'http://127.0.0.1:4175', aud: 'local-access-aud' },
};

const productionServer: ServerConfig = {
  // TODO(albert): confirm the lead notification address
  leads: { notifyTo: 'admin@zenetlabs.com' },
  resendBaseUrl: 'https://api.resend.com',
  // TODO(albert): set { teamDomain: 'https://<team>.cloudflareaccess.com', aud } once the Access app exists
  access: null,
};

export function serverConfig(env: string | undefined): ServerConfig {
  if (!env) return localServer;
  if (env === 'production') return productionServer;
  throw new Error(`Unknown CLOUDFLARE_ENV: ${env}`);
}
