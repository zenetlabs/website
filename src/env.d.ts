declare const __SITE__: import('../site.config').SiteConfig;
declare const __GA4_ID__: string | null;
declare const __SERVER__: import('../site.config').ServerConfig;
declare const __ASSISTANT__: boolean;
declare const __CHAT_FAKE__: boolean;

declare namespace Cloudflare {
  interface Env {
    RESEND_API_KEY: SecretsStoreSecret;
    TURNSTILE_SECRET_KEY: SecretsStoreSecret;
    DB: D1Database;
    AI?: Ai;
    GOOGLE_CALENDAR: SecretsStoreSecret;
    TOOLS_BEARER_SECRET: SecretsStoreSecret;
    LEAD_LIMITER: RateLimit;
    TOOLS_LIMITER: RateLimit;
    BOOK_LIMITER: RateLimit;
    CHAT_LIMITER: RateLimit;
  }
}
