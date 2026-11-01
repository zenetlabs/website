# Analytics and consent

What the site measures, where to see it, how consent works, and the steps the owner does outside the repo.

Status: **GA4 is off in production** (`ga4Id` is `null` in `site.config.ts`). With no id there is no banner, no footer "Cookie settings" button, no inline consent snippet and no Google request. Cloudflare Web Analytics (cookieless) runs either way.

## 1. What we measure and where

| Source | What | Where to look |
|---|---|---|
| Cloudflare Web Analytics | Page views, referrers, Core Web Vitals. Cookieless, always on, no consent needed. | Cloudflare dashboard, Analytics & Logs, Web Analytics |
| GA4 (consent only) | Automatic `page_view`, plus the events below | GA4 Reports, Realtime and Engagement, Events; Admin, Key events; Explore |
| D1 `leads` table | Every lead with `landing_page`, `referrer`, `utm_*`, `gclid`, `submit_page` | `/internal/leads` (Cloudflare Access) |

GA4 events (`src/lib/track.ts`, typed, no free-text params):

| Event | Params | Fired from |
|---|---|---|
| `cta_click` | `cta_id`: `header`, `header_menu`, `hero`, `hero_pricing`, `page_hero`, `page_cta`, `pricing`, `about`, `services`, `contact_book` | `CtaLink` |
| `language_switch` | none | the non-current link of the language switch |
| `pricing_view` | none | once per pricing page load, when GA starts |
| `generate_lead` | `method`: `form`, `chat`, `voice`, `calculator`, `booking` | the contact form after a successful submit (`form`; `calculator` when it was sent from the price calculator page), the `/book` form (`booking`), the chat booking card (`chat`) and a call whose `book_meeting` came back booked (`voice`) |
| `calculator_complete` | `project_type`: `automation`, `agent`, `web` | the price calculator, when the form is submitted with JavaScript. Not on a direct visit to a result link |
| `book_meeting` | none | the `/book` form, the chat booking card and a voice call, after the booking succeeded |
| `chat_open` | none | the chat launcher, on every open |
| `chat_message` | none | the chat panel, for each visitor message actually sent (never its text) |
| `voice_call_start` | none | the voice panel, each time a call connects |

Lead attribution: with **marketing** consent the first landing page, referrer and campaign tags are kept in `localStorage` for 90 days and sent with each lead instead of the current page load. Without it a lead carries only the page load it was sent from. The request shape and the server do not change.

## 2. Consent model

| Category | Stored | Duration | Gates |
|---|---|---|---|
| Strictly necessary | `zenet-consent` in `localStorage` (`{ analytics, marketing, revision, at }`) | 12 months | nothing (it records the choice) |
| Analytics | GA4 cookies `_ga` and `_ga_<ID>` | `cookie_expires` 13 months | loading `gtag.js` |
| Marketing | `zenet-first-touch` in `localStorage` (`{ landing, referrer, at }`) | 90 days | first-touch attribution, `ad_*` Consent Mode signals |

Consent Mode v2, **basic** mode:

- An inline snippet in the root route `scripts()` (only when `ga4Id` is set) defines `dataLayer` and `gtag` and sets `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` to `denied`.
- On every choice `consent update` is pushed: analytics maps to `analytics_storage`, marketing to the three `ad_*` signals.
- `gtag.js` is requested only when analytics is granted: after the window `load` event for returning visitors, at once on an Accept click. It is never proxied. Marketing alone loads no Google tag.
- Withdrawal on the same page: `window['ga-disable-<id>'] = true`, a denied update, and `_ga`, `_ga_*` and `_gcl_*` deleted through the Cookie Store API where the browser has it. Withdrawing marketing removes the first-touch record.
- `ga4Id` becomes the build-time constant `__GA4_ID__` (`vite.config.ts`, `vitest.config.ts`). With `null`, the bundler drops every analytics module, chunk, the inline snippet and the legal-page variants.
- When configured, the only eager code is `src/lib/track.ts` (a few lines: `track()` returns unless `window.zenetTracking` is set), `src/client.tsx` (a dynamic `import('@/lib/analytics')` after the window `load` event, which replays a stored choice) and `ConsentManager`. The store, `useConsent`, the banner and the dialog are lazy chunks that load after hydration. Copy lives in `src/content/{en,es}/consent.ts`.
- Lead attribution reads the store through a dynamic import at submit time.

**Bump `COOKIE_CONSENT_REVISION`** (`src/lib/consent.ts`) whenever a vendor, cookie or purpose is added or changed. It re-asks everyone.

Cookie banners are not shown when `ga4Id` is `null`, because nothing optional would be stored.

### Behaviour to know about

- `track()` drops CTA clicks made before the analytics boot. The boot runs after the window `load` event for performance, and `track()` does nothing until it has switched tracking on.
- First touch is captured only when consent is given on the entry page (an empty or cross-origin referrer). We do not store campaign data before consent, so a choice made after navigating inside the site records nothing; the lead then carries the page load it was sent from.
- Withdrawing in one tab applies to every open tab (the consent record's `storage` event re-runs the consent update, the `ga-disable` flag and the cookie deletion). Cookies (`_ga`, `_ga_*`, `_gcl_*`) are deleted through the Cookie Store API (Chromium, Firefox 140+, Safari 18.4+). On a browser without it, the `ga-disable-<id>` flag and the denied consent update still stop Google Analytics from reading or writing, and the cookies expire on their own.
- The footer "Cookie settings" control is a link to the cookies policy (`#manage`). Once the dialog exists it opens the dialog instead; without JavaScript it navigates.
- The banner has no visible title: it is named by `aria-label` (a deviation from plan D10), to keep it short on mobile.

## 3. Adding an event

Extend `ParamEvents` or `PlainEvent` in `src/lib/track.ts`, then call `track()`. Params are literal unions so free text (personal data) cannot be passed. Register new params as custom dimensions in GA4. A new CTA gets a `CtaId` and uses `CtaLink`; `e2e/consent.e2e.ts` fails for any booking CTA without `data-cta`.

## 4. Verify

- **Tag Assistant:** tagassistant.google.com, add `https://zenetlabs.com`, click Accept all in the debug window. The Consent tab shows the default as all denied, then the update. The events list shows `page_view`, and `pricing_view` on `/pricing`.
- **DebugView:** GA4 Admin, Data display, DebugView (Tag Assistant sessions appear automatically).
- **Browser:**
  - DevTools Network, filter `googletagmanager|google-analytics`. Before a choice and after Reject there must be zero requests. After Accept: `gtag/js?id=...`, then `g/collect?v=2...` with `gcs=G111` (accept all) or `G101` (analytics only).
  - `localStorage.getItem('zenet-consent')` and `localStorage.getItem('zenet-first-touch')`.
  - `copy(dataLayer.map((a) => Array.from(a)))`.
- **Prod HTML:** `curl -s --compressed -H 'Accept: text/html' https://zenetlabs.com/ | grep -cE 'gtag/js|zaraz'` must print `0` in both states. `scripts/smoke.sh` checks it for `/` and `/es`.
- **Locally:** the local config has a dummy id (`G-LOCALTEST00`), so `pnpm build && pnpm preview` shows the banner. `pnpm e2e` intercepts Google requests.

## 5. GA4 setup (owner)

1. **Property:** create it with time zone Europe/Madrid and currency EUR, and a web data stream for `https://zenetlabs.com`.
2. **Enhanced measurement:** keep page views, scrolls and outbound clicks. Turn off form interactions (they duplicate `generate_lead`) and video.
3. **Data retention:** 14 months. **Google signals: off** (if you turn it on, update the cookies page and bump the revision).
4. **Data processing terms:** accept them under Admin, Account details.
5. **Custom dimensions** (event-scoped): `method` and `cta_id`.
6. **Key events:** create `generate_lead` and `book_meeting` (Admin, Key events, New key event). In Google Ads these are called conversions.
7. **Search Console link:** Admin, Product links, Search Console links.
8. **Internal traffic (optional):** define your IP.

## 6. Activation (one PR)

1. Set `production.ga4Id` in `site.config.ts` (`G-XXXXXXXXXX`).
2. Set `updated` in `cookies-{en,es}.tsx` and `privacy-{en,es}.tsx` to the activation date.
3. Set `PAGES.cookies.lastmod` and `PAGES.privacy.lastmod` in `src/lib/page-registry.ts` to that date.
4. Set `CONSENT_VERSION` in `src/server/lead.ts` to the new privacy date, and update the date assertion in `legal.test.tsx`. That file is the lead path, so the PR review level follows `CLAUDE.md` (`high`).
5. Remove the "no consent defaults" check from `scripts/smoke.sh` (the inline snippet now exists on purpose).
6. Deploy, then run Tag Assistant and DebugView on prod, plus `bash scripts/smoke.sh`.
7. **Owner step, cookie check:** open `https://zenetlabs.com/?gclid=x` in a fresh browser profile, click Accept all, then list the cookies (DevTools, Application, Cookies). Expect only `zenet-consent`'s storage entry plus `_ga` and `_ga_<ID>`. If any `_gcl_*` cookie (for example `_gcl_au` or `_gcl_aw`) appears, either disclose it on the cookies page (name, purpose, duration, in both locales) and bump `COOKIE_CONSENT_REVISION`, or stop granting `ad_storage`, `ad_user_data` and `ad_personalization` while there is no ads tag. Withdrawal already deletes `_gcl_*` along with `_ga*`.
8. Keep the Cloudflare **Google tag gateway** and **Zaraz** off for the zone. Both inject tags before consent.

## 7. Google Search Console (both locales)

One domain property covers `/` and `/es`.

1. search.google.com/search-console, Add property, **Domain**, `zenetlabs.com`, copy the TXT value. If Search Console offers Cloudflare's automatic DNS verification, accept it. Otherwise: Cloudflare dashboard, zone zenetlabs.com, DNS, Records, Add record, Type `TXT`, Name `@`, Content `google-site-verification=...`, TTL Auto, Save, then **Verify** in Search Console.
2. Sitemaps, Add a new sitemap, `https://zenetlabs.com/sitemap.xml`, Submit. It lists both locales with hreflang alternates and `robots.txt` already advertises it. Status should be "Success", with the discovered count equal to the number of `<loc>` entries.
3. **Spanish view:** Add property, **URL prefix**, `https://zenetlabs.com/es/`. Owners of the domain property are verified automatically. For an English view, filter Performance by Page, "doesn't contain" `/es`.
4. URL Inspection for `https://zenetlabs.com/`, `/es`, `/pricing`, `/es/precios` and the service pages, then Request indexing. Check the Google-selected canonical.
5. Optional: add the alias domains as Domain properties. They 301 to zenetlabs.com and show under Page indexing as "Page with redirect".

## 8. Bing Webmaster Tools

1. bing.com/webmasters, sign in, **Import from Google Search Console**, authorise, select zenetlabs.com, Import. This verifies the site and copies the sitemaps. Alternative: Add site `https://zenetlabs.com/`, then verify through Cloudflare DNS (the CNAME or TXT that Bing shows).
2. Sitemaps, Submit sitemap, `https://zenetlabs.com/sitemap.xml` (check it after the import too).
3. URL Inspection for `/es` and `/es/precios`, Request indexing.
4. Optional: IndexNow (Bing, IndexNow) or Cloudflare Crawler Hints. Check that it applies to Worker responses before relying on it.

Menu names change; these steps were checked on 2026-10-30 against third-party guides.

## 9. Troubleshooting

- **No banner:** `ga4Id` is `null`, a choice is already stored, or the stored revision differs.
- **No gtag:** analytics was not granted, or an ad blocker is on. Cloudflare Web Analytics and the D1 lead attribution stay authoritative.
- **gtag in the HTML before consent:** Cloudflare's Google tag gateway or Zaraz is on. Turn them off.

## 10. CSP note

There is no Content-Security-Policy today (`src/lib/security-headers.ts`, `public/_headers`). If one is added: `script-src https://www.googletagmanager.com 'sha256-<hash of the inline consent snippet>'` and `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`.
