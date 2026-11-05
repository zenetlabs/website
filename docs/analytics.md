# Analytics and consent

What the site measures, where to see it, how consent works, and the steps the owner does outside the repo.

Status: **GA4 is on in production** (`ga4Id` is set in `site.config.ts`; the measurement ID is public). Nothing optional is stored or requested until a visitor accepts. With `ga4Id` set to `null` there is no banner, no footer "Cookie settings" button, no inline consent snippet and no Google request. Cloudflare Web Analytics (cookieless) runs either way.

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

Lead attribution: with **attribution** consent the first landing page, referrer and campaign tags are kept in `localStorage` for 90 days and sent with each lead instead of the current page load. Without it a lead carries only the page load it was sent from. The request shape and the server do not change.

## 2. Consent model

| Category | Stored | Duration | Gates |
|---|---|---|---|
| Strictly necessary | `zenet-consent` in `localStorage` (`{ analytics, attribution, revision, at }`) | 12 months | nothing (it records the choice) |
| Analytics | GA4 cookies `_ga` and `_ga_<ID>` | `cookie_expires` 13 months | loading `gtag.js` |
| Attribution | `zenet-first-touch` in `localStorage` (`{ landing, referrer, at }`) | 90 days | first-touch attribution sent with a lead. It never reaches Google |

Consent Mode v2, **basic** mode:

- An inline snippet in the root route `scripts()` (only when `ga4Id` is set) defines `dataLayer` and `gtag` and sets `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` to `denied`.
- On every choice `consent update` is pushed: analytics maps to `analytics_storage`. The three `ad_*` signals are **always `denied`** while there is no ads tag, so no `_gcl_*` cookie can appear.
- `config` sets `send_page_view: false`. `page_view` is sent by `src/lib/analytics.ts` on the first load and on every client-side navigation (history `pushState`/`replaceState`/`popstate`, de-duplicated by the sanitised URL), after a `gtag('set', …)` of `page_location`, `page_referrer` and `page_title`, so every later event carries the current clean URL. `analyticsLocation()` keeps only `utm_*` and drops the hash and every other parameter (no `gclid`, no calculator answers). `analyticsReferrer()` applies the same rule to a same-site referrer and keeps only the origin of a cross-site one.
- `gtag.js` is requested only when analytics is granted: after the window `load` event for returning visitors, at once on an Accept click. It is never proxied. Attribution alone loads no Google tag.
- Withdrawal on the same page: `window['ga-disable-<id>'] = true`, a denied update, and the analytics cookies (`_ga`, `_ga_*`, `_gid`, `_gat*`) deleted through the Cookie Store API where the browser has it. The advertising cookies (`_gcl_*`, `_gac_*`, `FPAU`, `FPGCL`) are deleted on every update, whatever the choice. Withdrawing attribution removes the first-touch record.
- `ga4Id` becomes the build-time constant `__GA4_ID__` (`vite.config.ts`, `vitest.config.ts`). With `null`, the bundler drops every analytics module, chunk, the inline snippet and the legal-page variants.
- When configured, the only eager code is `src/lib/track.ts` (a few lines: `track()` returns unless `window.zenetTracking` is set), `src/client.tsx` (a dynamic `import('@/lib/analytics')` after the window `load` event, which replays a stored choice) and `ConsentManager`. The store, `useConsent`, the banner and the dialog are lazy chunks that load after hydration. Copy lives in `src/content/{en,es}/consent.ts`.
- Lead attribution reads the store through a dynamic import at submit time.

**Bump `COOKIE_CONSENT_REVISION`** (`src/lib/consent.ts`) whenever a vendor, cookie or purpose is added or changed. It re-asks everyone.

Cookie banners are not shown when `ga4Id` is `null`, because nothing optional would be stored.

### Behaviour to know about

- `track()` drops CTA clicks made before the analytics boot. The boot runs after the window `load` event for performance, and `track()` does nothing until it has switched tracking on.
- First touch is captured only when consent is given on the entry page (an empty or cross-origin referrer). We do not store campaign data before consent, so a choice made after navigating inside the site records nothing; the lead then carries the page load it was sent from.
- Withdrawing in one tab applies to every open tab (the consent record's `storage` event re-runs the consent update, the `ga-disable` flag and the cookie deletion). Cookies (`_ga`, `_ga_*`, `_gid`, `_gat*`; the advertising ones always) are deleted through the Cookie Store API (Chromium, Firefox 140+, Safari 18.4+). On a browser without it, the `ga-disable-<id>` flag and the denied consent update still stop Google Analytics from reading or writing, and the cookies expire on their own.
- The footer "Cookie settings" control is a link to the cookies policy (`#manage`). Once the dialog exists it opens the dialog instead; without JavaScript it navigates.
- The banner has a visible title (`h2`) and, below `sm`, the short copy with a "More info" toggle. Reject all, Settings and Accept all are three buttons with the same class (nothing nudges the choice). Closing the settings dialog without a choice returns focus to Settings; after a choice focus goes to `#main`.

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
9. **Page views:** turn off "Page changes based on browser history events" (we send `page_view` ourselves) and site search.
10. **Data sharing:** turn off every account-level data sharing setting (Admin, Account, Data collection and modification, Data sharing settings).
11. **Data redaction:** turn on email and query-parameter redaction (Admin, Data stream, Configure tag settings, Redact data).

## 6. Activation

The ordered recipe (the PR contents, the bumps, the CI guards to change and the review level) is in [RUNBOOK.md](RUNBOOK.md) section 9, `ga4Id`. What stays here is the feature-specific verification after the deploy:

- **Tag Assistant and DebugView** on production (section 4), plus `bash scripts/smoke.sh` (it expects the consent defaults in the HTML and no Google tag, which only loads after consent).
- **Owner step, cookie check:** open `https://zenetlabs.com/?gclid=x` in a fresh browser profile, click Accept all, then list the cookies (DevTools, Application, Cookies). Expect only `_ga` and `_ga_<ID>`, and no `_gcl_*` or `_gac_*` cookie (the ad signals are always denied and any such cookie is deleted).
- Keep the Cloudflare **Google tag gateway** and **Zaraz** off for the zone. Both inject tags before consent.

`CONSENT_VERSION` lives in `src/server/lead-fields.ts`, so the flip PR touches the lead path and is reviewed at `high` (`CLAUDE.md`).

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
