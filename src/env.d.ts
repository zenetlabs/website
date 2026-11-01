declare const __SITE__: import('../site.config').SiteConfig;
declare const __GA4_ID__: string | null;
declare const __SERVER__: import('../site.config').ServerConfig;

declare namespace Cloudflare {
  interface Env {
    RESEND_API_KEY: SecretsStoreSecret;
    TURNSTILE_SECRET_KEY: SecretsStoreSecret;
    DB: D1Database;
    LEAD_LIMITER: RateLimit;
  }
}
