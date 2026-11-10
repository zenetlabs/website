# Owner checklist

As of 2026-11-01 (R13 final QA); booking and the assistant went live on 2026-11-06 (see the Booking and Assistant items and RB 9). The canonical copy of this list; `~/vault/projects/zenetlabs-website/owner-checklist.md` is a scrubbed snapshot. Procedures are in the [runbook](RUNBOOK.md); this file only says what needs you, where, and what it unblocks.

The `TODO(albert)` appendix is a snapshot: its line numbers go stale as files change. Regenerate it with `git grep -n 'TODO(albert)' -- . ':!*.test.*' ':!*.md'`.

Everything below needs the owner (a login, a decision or a value only you hold). Ordered by priority. "RB" is a section of the [runbook](RUNBOOK.md). Placeholders such as `<store-id>` are never replaced with real values in a document. Production state on the date above: booking, the assistant, GA4 and voice (2026-11-10) are live (the calculator is dark), WebMCP is on, GA4 measures consenting visitors only, and Cloudflare Web Analytics is the cookieless traffic source of truth.

## Already done (no action)

- The deploy token has D1 permission (2026-10-31).
- The Secrets Store entries exist with placeholders, so deploys are not blocked (2026-11-01): the Google calendar bundle (`unconfigured`), the ElevenLabs tool secret (a random value nobody knows) and the ElevenLabs API key (`UNSET`). Both ElevenLabs values were set for real on 2026-11-10.
- The sitemap was resubmitted after the URL change in phase 1.
- Preview aliases were re-uploaded from a dark production build (2026-11-01).

## P0: legal and compliance on the live site

1. **Spanish fiscal address: done (2026-11-05).** `src/content/es/entity.ts` holds the fiscal address, so every `es` page (footer, legal pages, form consent, JSON-LD, llms files, the Spanish voice agent) now names the sole trader, under Spanish law, the Barcelona courts and the AEPD; no GDPR art. 27 representative is needed for the `es` side. The RB 9 bumps were applied in the same PR (`CONSENT_VERSION` 2026-11-05, 18 `lastmod` values, the legal `updated` dates, the smoke footer line). After the deploy: a Rich Results Test on `/es` and `bash scripts/smoke.sh`.
2. **Legal review: first draft done (2026-11-05), pending your or counsel's sign-off.** Drafted: privacy (en, es), cookies (en, es), the aviso legal (LSSI art. 10 data, both entity variants, the "Precios" clause), the legal clauses (en, es), the retention periods as the code applies them (24 months for leads, confirmed bookings and the email log; 30 days for unconfirmed bookings, transcripts and voice records; about 51 hours for the chat IP fingerprints; 7 days at most for server logs, up to 30 days in D1 Time Travel backups; 30 days at Resend; a monthly hand routine for mailbox threads and Calendar events older than 24 months (RB 13); 90 days for first-touch; 12, 13 and 14 months for consent, GA cookies and GA4 data), the GA4, assistant, voice, calculator and WebMCP sections behind their flags, the AI Act art. 50 notices for the chat and the voice assistant, the AI Act art. 4 sentence on the training pages and the travel-agency REAV and registration wording. Settled by you on 2026-11-05: the accounts and processors follow the market (es data: the sole trader and his direct processors; en data: Zenet Technology Pte. Ltd.), the professional registration (no Registro Mercantil, no licence), and the Singapore DPO (Dan Lu, privacy@zenetlabs.com). Still open: the counsel sign-off line at the top of each legal file, the specific `TODO(albert)` markers in appendix group "Legal and consent" (GDPR art. 3(2) and 27 for the English pages), the asesoría's confirmation of the REAV wording (`travel-agencies.ts`) and the Verifactu page (group "Es landing pages"). Done: the ElevenLabs transfer wording, checked on 2026-11-10 against the ElevenLabs DPA dated 8 April 2026, which applies to every customer through the Terms and uses the Commission's SCCs (controller-to-processor module); the privacy pages keep the SCC sentence and do not claim DPF certification, which could not be confirmed in the official registry.
3. **Confirm the lead notification address** (`site.config.ts`, `productionServer.leads.notifyTo`; the `TODO(albert)` there). Check that Resend's Suppressions does not contain it. Production holds no lead at all so far, so this has never been proven end to end: see the optional acceptance lead in P1.
4. **Access app for `/internal*`: done 2026-11-05.** Self-hosted application `zenetlabs-internal` on `zenetlabs.com/internal` (covers every path under it), with the reusable `operators` policy (your address only, 24 h session); its team domain and AUD are in `productionServer.access`. Optional: Access on previews (see "Preview aliases" in P3).
5. **Search Console and Bing Webmaster Tools** ([analytics.md](analytics.md) sections 7 and 8): verify the domain, submit `sitemap.xml`, inspect the key URLs, and resubmit after every flip.
6. **Rich Results Test** on `/`, `/es`, `/about`, `/services/ai-automation`, `/case-studies/viatsy`, `/es/servicios/integraciones/holded-prestashop`, `/es/precios`, `/es/casos/viatsy`, `/es/aviso-legal`, `/pricing` and `/es/servicios/agentes-de-ia`. Expected: Breadcrumb on inner pages, Organization, Article on case pages. FAQ shows "not eligible" by design (Google stopped FAQ rich results on 2026-05-07; the markup stays valid).
7. **Deploy token.** Confirm in the dashboard that the permission set matches RB 4.

## P1: content accuracy on live pages

All items are `TODO(albert)` markers listed in the appendix. Groups:

- **Case figures and claims** (`cases.ts`, `case-pages/viatsy.ts`, en and es): the `[X]` figures in both locales and every claim. `[X]` renders nowhere: a missing figure is `null`.
- **Founder** (`founder.ts`, en and es): the photo (WebP up to 40 KB, twice the rendered size, under `public/`, with width and height) and the LinkedIn and GitHub URLs (they enable `sameAs`).
- **Service pages** (five per locale, `service-pages/*.ts`): timelines, cases, FAQ answers, the Zapier/Make/n8n comparison, the stack and hosts, data-access promises, the training lead times and formats, where workshops can be held, and the legal wording of safe use.
- **Pricing and services:** the `pricing.ts` lists, the `services.ts` maintenance tier names and scope, the services-hub "small consultancy" claim, the about copy, the home founder title and the FAQ answers.
- **Holded pair pages and Verifactu** (es): re-check the API, plugin and limit claims on holded.com/developers before the next deploy that touches them, the asesoría check, and the declaración responsable. **Re-check the BOE and the AEAT for the Verifactu dates before any deploy that touches them** (the announced October 2028 delay was not in the BOE on 2026-10-31).
- **Email copy** (`src/server/lead-emails.ts`): the two-working-days promise and the booking confirmation.
- **WebMCP copy** (`webmcp.ts`, en and es): live now on WebMCP-capable browsers.
- **Optional, recommended once: an acceptance lead per locale on production** with two inboxes you control (the real form, both emails, the D1 row, then cleanup with the `[TEST]` SQL in RB 5). Production D1 is empty, so no real lead has ever crossed the live path. Check Resend's Emails and Suppressions if one email is missing.

## P2: features to light up

Each one: do the prerequisites, then the flip PR in RB 9 (one flag per PR, one at a time). Suggested order: Access, entity address and legal review first; then GA4 (so launches are measured); booking; calculator; assistant; voice. The WebMCP origin-trial token can go in at any time.

- **GA4.** The code is live with the measurement ID. Property settings per [analytics.md](analytics.md) section 5 (14-month retention, Google signals off, enhanced measurement without form interactions and video, data processing terms, the `method` and `cta_id` dimensions, `generate_lead` and `book_meeting` as key events, the Search Console link, history-change page views and site search off, account-level data sharing off, data redaction for email and query parameters). After the deploy: the Tag Assistant and cookie checks, and keep Cloudflare Zaraz and the Google tag gateway off. Review the consent copy (`consent.ts`).
- **Booking.** Done 2026-11-06: the owner steps and the preview acceptance passed, and the flag is on. What remains is the owner's own real booking after the deploy (RB 9). The steps for reference: G1 to G11: Google Cloud project, Calendar API, service account with a JSON key, domain-wide delegation for `calendar.events.owned` and `calendar.freebusy` on the booking user, Meet enabled, a test calendar, the key bundle (with `subject`, `calendar_id` and `test_calendar_id`) pasted into `ZENETLABS_PROD_GOOGLE_CALENDAR` (RB 6), then `/api/health` shows `booking:true`. Review `book.ts` and the 14-day horizon (`booking-rules.ts`; the call windows, Monday to Thursday 10:00-16:00 Madrid, were confirmed on 2026-11-10), the "free, no commitment" wording, and do the `[TEST]` acceptance booking on a preview alias built with the flag on. Calendar events are deleted automatically 24 months after the booking (the 03:00 tick, RB 8). Every booking now needs the visitor's click on an emailed link, so: **the cancel link** in each owner email (`Cancel this booking: …`) opens a page with the booking and one button, "Cancel the call and email the visitor"; one click on the link and one on the button deletes the event (Google tells the guest) and sends our cancellation email; opening the link alone never cancels. A re-sent owner email carries a new link and only the newest works. **The Resend quota**: confirmation emails are capped at 40 a day site-wide, 3 per address and 5 per connection (RB 7), well inside Resend's daily limit for the plan; check the plan's daily and monthly quota before the flip and raise the site cap only with it. Key hygiene: rotate by creating a new key, updating the secret and deleting the old key; revoke by deleting the key or the delegation entry.
- **Calculator.** Review every coefficient, cap, the discount and uplift rules, the maintenance thresholds, the "Request a call" wording and the privacy sentence (`pricing-rules.ts`). Flip in RB 9.
- **Assistant.** Done 2026-11-06: the bake-off kept `@cf/zai-org/glm-4.7-flash`, the 22-question acceptance passed on a preview, the daily budget is 100,000 neurons (about US$1.10 a day) and the flag is on. What remains: optionally an AI Gateway (logs off, cache off; send the name), the weekly transcript and `ai_usage` skim (RB), and the review of the prompt and widget copy `TODO(albert)` items. For reference, the steps were: raise `dailyNeuronBudget`; review the prompt, widget copy, notice, retention and budget; run the question set on a preview alias; then flip. If the first deploy with the `AI` binding fails with an authentication error naming AI, add Account, Workers AI, Read to the deploy token.
- **Voice: live (2026-11-10).** The ElevenLabs DPA and transfer wording was checked on 2026-11-10 (P0 item 2). Still yours: review the voice `TODO(albert)` items; counsel's sign-off of the legal draft stays open (P0 item 2). The original steps, kept as a record (needs booking first). ElevenLabs account on a plan with enough minutes, DPA accepted and training opt-outs checked; an API key restricted to Agents with a credit limit into `ZENETLABS_PROD_ELEVENLABS_API_KEY`; a tool secret into `ZENETLABS_PROD_ELEVENLABS_TOOL_SECRET`; `pnpm voice:plan` then `pnpm voice:apply` (prints the two agent ids); optionally the GitHub `production` environment secret `ELEVENLABS_API_KEY` so every deploy re-syncs the agents; Bot Fight Mode off for `zenetlabs.com`; review the spoken messages, caps (30 calls a day, 5 minutes each, up to about US$360 a month at the cap) and the model; confirm the ElevenLabs DPA and EU-US data transfer wording on the privacy pages; then flip.
- **WebMCP origin-trial token** (optional): register at the Chrome Origin Trials console for `https://zenetlabs.com`, put the token in `webmcp.originTrialToken` (`low` PR), record the expiry.

## P3: platform and housekeeping

- **Workers plan: done 2026-11-05.** The account is on Workers Paid, so the CPU, cron and log limits are the Paid ones; for the assistant, raise `dailyNeuronBudget` to what you want to spend.
- **Deploy token:** move it from a user token to an account-owned token and rotate it (the GitHub secret dates from 2024).
- **Preview aliases.** The public preview aliases serve production secrets and D1, and cannot be deleted (names in the owner's vault notes; RB 2). Choose: Access on previews, `preview_urls: false`, or keep re-uploading dark after every probe.
- **Security headers.** Decide on HSTS `includeSubDomains` and `preload` (a one-way commitment for the zone and its subdomains) and on a Content-Security-Policy (the deferred-entry inline loader and the consent snippet need a nonce or a hash; the voice SDK needs `connect-src` entries, see ai-assistant.md).
- **Bot Fight Mode:** off on the alias zones (CI smoke runs against them) and on `zenetlabs.com` (voice webhooks).
- **Rotate the tools bearer secret** when voice is set up (RB 6).
- **Delete test artefacts** after every acceptance run (RB 5, calendar events, mailbox).
- **Routine checks** (RB 15): weekly and monthly.
- **QA steps not run on 2026-11-01** (they need an interactive browser or a third-party site): a manual keyboard pass on `/`, `/es`, `/pricing`, `/services/ai-automation`, `/es/aviso-legal` and `/privacy` at 1280 and 320 px (the skip link, a visible focus ring on every control, **WCAG 2.4.11 focus not obscured** by the sticky header, the mobile menu with Enter and Esc, the language switch, contact-form errors announced and focused, reflow at 320 px, 200 % zoom, reduced motion); the Schema Markup Validator (validator.schema.org) on `/`, `/es`, `/about`, `/services/ai-automation`, `/case-studies/viatsy` and `/es/servicios/integraciones/holded-prestashop`; a PageSpeed Insights cross-check (pagespeed.web.dev) for `/` and `/es`, mobile and desktop; one Mozilla Observatory scan of `zenetlabs.com`.
- **Workers Logs retention:** 3 days until 2026-11-30, then Observability pricing from 2026-12-01.

## Appendix: every `TODO(albert)` in the repo

204 markers in 63 files. Regenerate before each review session with:

```sh
git grep -n 'TODO(albert)' -- . ':!*.test.*' ':!*.md'
```

### Site config (5)

- `site.config.ts:42` set true after reviewing src/content/pricing-rules.ts
- `site.config.ts:49` optional WebMCP origin-trial token for https://zenetlabs.com (docs/ai-assistant.md "WebMCP")
- `site.config.ts:157` confirm the lead notification address
- `site.config.ts:179` AI Gateway name (docs/ai-assistant.md "AI Gateway"); null calls Workers AI directly
- `site.config.ts:187` the most voice calls a UTC day can start, previews included, across both locales. At most 30 x 5 minutes = 150 minutes a day: about US$12 a day at US$...

### Calculator pricing rules (43)

- `src/content/pricing-rules.ts:12` uplift on every line by orders, documents or messages per month
- `src/content/pricing-rules.ts:15` "No rush" lowers the price by 5%; the ladder price is the floor
- `src/content/pricing-rules.ts:18` "As soon as possible" adds 20% and shortens the timeline by a quarter
- `src/content/pricing-rules.ts:21` an add-on adds half its own timeline because the work overlaps
- `src/content/pricing-rules.ts:25` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:26` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:27` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:28` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:31` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:32` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:33` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:34` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:37` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:38` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:39` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:40` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:43` Standard from 3 tools, from high volume or with 2+ components; Extended whenever an agent is included
- `src/content/pricing-rules.ts:48` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:51` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:52` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:53` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:54` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:56` the agent ceiling is the published ladder maximum
- `src/content/pricing-rules.ts:58` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:59` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:60` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:63` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:64` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:65` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:66` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:71` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:74` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:75` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:76` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:77` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:79` the agent ceiling is the published ladder maximum
- `src/content/pricing-rules.ts:81` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:82` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:83` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:86` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:87` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:88` (a coefficient or value to confirm; see the line)
- `src/content/pricing-rules.ts:89` (a coefficient or value to confirm; see the line)

### Service pages and the services hub (66)

- `src/content/en/service-pages/agents.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/agents.ts:23` confirm the timeline
- `src/content/en/service-pages/agents.ts:28` confirm the timeline
- `src/content/en/service-pages/agents.ts:67` confirm the flow steps and the approval example
- `src/content/en/service-pages/agents.ts:127` confirm the case
- `src/content/en/service-pages/agents.ts:148` confirm the data-access promises
- `src/content/en/service-pages/automation.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/automation.ts:22` confirm the timeline
- `src/content/en/service-pages/automation.ts:27` confirm the timeline
- `src/content/en/service-pages/automation.ts:66` confirm the flow steps
- `src/content/en/service-pages/automation.ts:105` confirm the case
- `src/content/en/service-pages/automation.ts:135` confirm Zapier, Make and n8n
- `src/content/en/service-pages/diagnostic.ts:1` review this page: the steps, the case, the FAQ answers
- `src/content/en/service-pages/diagnostic.ts:109` confirm the case
- `src/content/en/service-pages/integrations.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/integrations.ts:22` confirm the timeline
- `src/content/en/service-pages/integrations.ts:27` confirm the timeline
- `src/content/en/service-pages/integrations.ts:66` confirm the flow steps
- `src/content/en/service-pages/integrations.ts:113` confirm the case
- `src/content/en/service-pages/maintenance.ts:1` review this page: the tiers, the case, the FAQ answers
- `src/content/en/service-pages/maintenance.ts:114` confirm the case
- `src/content/en/service-pages/software.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/software.ts:22` confirm the timeline
- `src/content/en/service-pages/software.ts:27` confirm the timeline
- `src/content/en/service-pages/software.ts:111` confirm the case
- `src/content/en/service-pages/software.ts:138` confirm the stack and the hosts
- `src/content/en/service-pages/training.ts:1` review this page: lead times, the case, the FAQ answers
- `src/content/en/service-pages/training.ts:20` confirm the lead time
- `src/content/en/service-pages/training.ts:25` confirm the formats
- `src/content/en/service-pages/training.ts:97` where can workshops be held in person?
- `src/content/en/service-pages/training.ts:114` confirm the case
- `src/content/en/services-hub.ts:21` review the "small AI consultancy" claim
- `src/content/en/services.ts:79` tier names and scope
- `src/content/es/service-pages/agents.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/agents.ts:23` confirm the timeline
- `src/content/es/service-pages/agents.ts:28` confirm the timeline
- `src/content/es/service-pages/agents.ts:67` confirm the flow steps and the approval example
- `src/content/es/service-pages/agents.ts:128` confirm the case
- `src/content/es/service-pages/agents.ts:153` confirm the data-access promises
- `src/content/es/service-pages/automation.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/automation.ts:22` confirm the timeline
- `src/content/es/service-pages/automation.ts:27` confirm the timeline
- `src/content/es/service-pages/automation.ts:66` confirm the flow steps
- `src/content/es/service-pages/automation.ts:105` confirm the case
- `src/content/es/service-pages/automation.ts:135` confirm Zapier, Make and n8n
- `src/content/es/service-pages/diagnostic.ts:1` review this page: the steps, the case, the FAQ answers
- `src/content/es/service-pages/diagnostic.ts:112` confirm the case
- `src/content/es/service-pages/integrations.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/integrations.ts:22` confirm the timeline
- `src/content/es/service-pages/integrations.ts:27` confirm the timeline
- `src/content/es/service-pages/integrations.ts:70` confirm the flow steps
- `src/content/es/service-pages/integrations.ts:117` confirm the case
- `src/content/es/service-pages/maintenance.ts:1` review this page: the tiers, the case, the FAQ answers
- `src/content/es/service-pages/maintenance.ts:114` confirm the case
- `src/content/es/service-pages/software.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/software.ts:22` confirm the timeline
- `src/content/es/service-pages/software.ts:27` confirm the timeline
- `src/content/es/service-pages/software.ts:111` confirm the case
- `src/content/es/service-pages/software.ts:138` confirm the stack and the hosts
- `src/content/es/service-pages/training.ts:1` review this page: lead times, the case, the FAQ answers
- `src/content/es/service-pages/training.ts:20` confirm the lead time
- `src/content/es/service-pages/training.ts:25` confirm the formats
- `src/content/es/service-pages/training.ts:97` where can workshops be held in person?
- `src/content/es/service-pages/training.ts:114` confirm the case
- `src/content/es/services-hub.ts:21` review the "consultoría pequeña" claim
- `src/content/es/services.ts:79` tier names and scope

### Es landing pages (Holded, Verifactu, travel agencies) (30)

- `src/content/es/holded-pairs/holded-hubspot.ts:1` review this page: timelines, the Zapier comparison, every Holded/HubSpot API claim (re-check holded.com/developers before deploy)
- `src/content/es/holded-pairs/holded-hubspot.ts:24` confirm the timeline
- `src/content/es/holded-pairs/holded-hubspot.ts:29` confirm the timeline
- `src/content/es/holded-pairs/holded-hubspot.ts:83` re-check on holded.com/developers before deploy
- `src/content/es/holded-pairs/holded-hubspot.ts:121` re-check the limits per plan on holded.com/developers
- `src/content/es/holded-pairs/holded-hubspot.ts:148` confirm API access per plan
- `src/content/es/holded-pairs/holded-prestashop.ts:1` review this page: timelines, the plugin comparison, every Holded/PrestaShop API claim (re-check holded.com/developers before deploy)
- `src/content/es/holded-pairs/holded-prestashop.ts:24` confirm the timeline
- `src/content/es/holded-pairs/holded-prestashop.ts:29` confirm the timeline
- `src/content/es/holded-pairs/holded-prestashop.ts:91` re-check on holded.com/developers before deploy
- `src/content/es/holded-pairs/holded-prestashop.ts:114` asesoría check
- `src/content/es/holded-pairs/holded-prestashop.ts:130` re-check the limits per plan on holded.com/developers
- `src/content/es/holded-pairs/holded-prestashop.ts:146` confirm the plugin's current refund handling
- `src/content/es/holded-pairs/holded-prestashop.ts:153` confirm the supported versions
- `src/content/es/holded-pairs/holded-woocommerce.ts:1` review this page: timelines, the plugin comparison, every Holded/WooCommerce API claim (re-check holded.com/developers before deploy)
- `src/content/es/holded-pairs/holded-woocommerce.ts:24` confirm the timeline
- `src/content/es/holded-pairs/holded-woocommerce.ts:29` confirm the timeline
- `src/content/es/holded-pairs/holded-woocommerce.ts:91` re-check on holded.com/developers before deploy
- `src/content/es/holded-pairs/holded-woocommerce.ts:129` re-check the limits per plan on holded.com/developers
- `src/content/es/holded-pairs/holded-woocommerce.ts:145` confirm the plugin's current refund handling
- `src/content/es/travel-agencies.ts:1` review every claim
- `src/content/es/travel-agencies.ts:26` confirm the agency size we serve
- `src/content/es/travel-agencies.ts:28` confirm the timeline
- `src/content/es/travel-agencies.ts:77` asesoría to confirm the REAV and registration wording here and in the documents item
- `src/content/es/verifactu-page.ts:1` legal review of the whole page; re-check the BOE (RD 1007/2023 consolidated text) and the AEAT before each deploy and bump verifactuDates.checkedOn an...
- `src/content/es/verifactu-page.ts:32` confirm Holded shows its declaración responsable for the current version
- `src/content/es/verifactu-page.ts:37` confirm the timeline
- `src/content/es/verifactu-page.ts:63` confirm the producers' date
- `src/content/es/verifactu-page.ts:128` confirm Holded shows its declaración responsable for the current version
- `src/content/es/verifactu.ts:1` re-check the BOE (RD 1007/2023, consolidated text) and the AEAT before each deploy; if the postponement is published, rewrite the strip and the FAQ an...

### Case studies (18)

- `src/content/en/case-pages/viatsy.ts:1` confirm every claim; the figures live in cases.ts as [X]
- `src/content/en/case-pages/viatsy.ts:88` confirm the flow steps
- `src/content/en/cases.ts:10` confirm
- `src/content/en/cases.ts:18` [X]
- `src/content/en/cases.ts:25` [X]
- `src/content/en/cases.ts:34` confirm the flow steps
- `src/content/en/cases.ts:55` confirm
- `src/content/en/cases.ts:63` [X]
- `src/content/en/cases.ts:70` [X]
- `src/content/es/case-pages/viatsy.ts:1` confirm every claim; the figures live in cases.ts as [X]
- `src/content/es/case-pages/viatsy.ts:92` confirm the flow steps
- `src/content/es/cases.ts:10` confirm
- `src/content/es/cases.ts:18` [X]
- `src/content/es/cases.ts:25` [X]
- `src/content/es/cases.ts:34` confirm the flow steps
- `src/content/es/cases.ts:58` confirm
- `src/content/es/cases.ts:66` [X]
- `src/content/es/cases.ts:73` [X]

### Legal and consent (12)

- `src/content/en/consent.ts:3` review the banner and settings copy
- `src/content/en/legal-clauses.ts:1` counsel sign-off of the 2026-11-05 draft
- `src/content/es/consent.ts:3` review the banner and settings copy
- `src/content/es/legal-clauses.ts:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/cookies-en.tsx:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/cookies-es.tsx:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/legal-notice-es.tsx:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/privacy-en.tsx:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/privacy-en.tsx:360` counsel to confirm whether GDPR Art. 3(2) reaches the English pages and, if it does, whether the Art. 27(2) exemption applies or an EU representative...
- `src/routes/{-$locale}/-legal/privacy-es.tsx:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/privacy-extras-en.tsx:1` counsel sign-off of the 2026-11-05 draft
- `src/routes/{-$locale}/-legal/privacy-extras-es.tsx:1` counsel sign-off of the 2026-11-05 draft

### Assistant, voice and WebMCP copy and rules (10)

- `src/content/en/chat.ts:7` review the widget copy
- `src/content/en/voice.ts:4` review the voice copy
- `src/content/en/webmcp.ts:4` review the WebMCP tool titles, the agent-facing notes and the confirmation dialog copy
- `src/content/es/chat.ts:7` review the widget copy
- `src/content/es/voice.ts:4` revisar el texto de voz
- `src/content/es/webmcp.ts:4` review the WebMCP tool titles, the agent-facing notes and the confirmation dialog copy
- `src/server/chat/prompt.ts:15` review the assistant's rules and tone
- `src/server/voice/agent-config.ts:18` review the spoken messages. Neither promises a booking while
- `src/server/voice/prompt.ts:12` review the voice rules and tone
- `src/server/voice/settings.ts:3` review the call length, the model, the voices and the retention

### Home, pricing, about, FAQ, founder, booking and emails (19)

- `src/content/booking-rules.ts:23` confirm the 14-day booking horizon.
- `src/content/en/about.ts:15` confirm the studio description
- `src/content/en/about.ts:28` confirm
- `src/content/en/about.ts:40` confirm
- `src/content/en/book.ts:5` review the copy, including "free, no commitment" and the call being the step before the paid diagnostic
- `src/content/en/faq.ts:1` review answers
- `src/content/en/founder.ts:11` founder photo (WebP ≤ 40 KB, 2× the rendered size) under public/, then set { src, width, height }
- `src/content/en/founder.ts:13` LinkedIn / GitHub URLs
- `src/content/en/pricing.ts:23` confirm every list
- `src/content/en/pricing.ts:80` confirm
- `src/content/en/pricing.ts:82` confirm
- `src/content/es/book.ts:5` revisar el texto, incluido "gratis, sin compromiso" y que la llamada sea el paso previo al diagnóstico de pago
- `src/content/es/faq.ts:1` review answers
- `src/content/es/founder.ts:11` founder photo (WebP ≤ 40 KB, 2× the rendered size) under public/, then set { src, width, height }
- `src/content/es/founder.ts:13` LinkedIn / GitHub URLs
- `src/content/es/home.ts:85` confirm Holded shows its declaración responsable for the current version
- `src/content/es/pricing.ts:23` confirm every list
- `src/server/lead-emails.ts:238` review the booking confirmation copy
- `src/server/lead-emails.ts:267` review the confirmation copy and the two-working-days promise
