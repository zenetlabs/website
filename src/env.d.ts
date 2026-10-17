declare const __SITE__: import('../site.config').SiteConfig;

declare namespace Cloudflare {
  interface Env {
    RESEND_API_KEY: SecretsStoreSecret;
    TURNSTILE_SECRET_KEY: SecretsStoreSecret;
  }
}
