# Owner checklist

As of 2026-11-01 (R13 final QA). The canonical copy of this list; `~/vault/projects/zenetlabs-website/owner-checklist.md` is a scrubbed snapshot. Procedures are in the [runbook](RUNBOOK.md); this file only says what needs you, where, and what it unblocks.

The `TODO(albert)` appendix is a snapshot: its line numbers go stale as files change. Regenerate it with `git grep -n 'TODO(albert)' -- . ':!*.test.*' ':!*.md'`.

Everything below needs the owner (a login, a decision or a value only you hold). Ordered by priority. "RB" is a section of the [runbook](RUNBOOK.md). Placeholders such as `<store-id>` are never replaced with real values in a document. Production state on the date above: every optional feature is dark (booking, calculator, assistant, voice, GA4), WebMCP is on, and Cloudflare Web Analytics is the only measurement.

## Already done (no action)

- The deploy token has D1 permission (2026-10-31).
- The Secrets Store entries exist with placeholders, so deploys are not blocked (2026-11-01): the Google calendar bundle (`unconfigured`), the ElevenLabs tool secret (a random value nobody knows) and the ElevenLabs API key (`UNSET`).
- The sitemap was resubmitted after the URL change in phase 1.
- Preview aliases were re-uploaded from a dark production build (2026-11-01).

## P0: legal and compliance on the live site

1. **Spanish fiscal address.** `src/content/es/entity.ts` (the `TODO(albert)` there). The Spanish LSSI rules need a domicilio; until it is set, every `es` page shows the Singapore entity, which also leaves the GDPR art. 27 question open while `es` is served under it. Setting it moves the footer, legal pages, form consent and JSON-LD to the Spanish entity and needs the bumps in RB 9 (entity row). Unblocks: the Spanish legal pages being final.
2. **Legal review, by you or counsel.** Privacy (en, es) and cookies (en, es); the aviso legal (both entity variants and the "Precios" clause) and the legal clauses (en, es); the retention periods (24 months for leads, 30 days for transcripts and unconfirmed bookings, 90 days for first-touch, 12, 13 and 14 months for consent, GA cookies and GA4 data); the AI Act art. 50 notices for the chat and the voice assistant (before their flips); the Verifactu page; the AI Act art. 4 sentence on the training page; the travel-agency REAV wording (from the asesoría). The files are in appendix groups "Legal and consent" and "Es landing pages".
3. **Confirm the lead notification address** (`site.config.ts`, `productionServer.leads.notifyTo`; the `TODO(albert)` there). Check that Resend's Suppressions does not contain it. Production holds no lead at all so far, so this has never been proven end to end: see the optional acceptance lead in P1.
4. **Access app for `/internal*`** (Zero Trust, self-hosted application on `zenetlabs.com`, path `internal*`, one-time PIN, policy allowing your identity). Send the team domain and the AUD (public values, keep them out of the vault); they go into `productionServer.access` in a one-file `high` PR (RB 9). Until then the lead pages answer 404 and leads are readable only through D1 SQL (RB 5). Optional in the same step: Access on previews only (see "Preview aliases" in P3).
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

- **GA4.** Create the property per [analytics.md](analytics.md) section 5 (time zone Europe/Madrid, currency EUR, enhanced measurement without form interactions and video, 14-month retention, Google signals off, data processing terms, the `method` and `cta_id` dimensions, `generate_lead` and `book_meeting` as key events, the Search Console link). Hand over the measurement ID. After the flip: the Tag Assistant and `_gcl_*` cookie checks, and keep Cloudflare Zaraz and the Google tag gateway off. Review the consent copy (`consent.ts`).
- **Booking.** G1 to G11: Google Cloud project, Calendar API, service account with a JSON key, domain-wide delegation for `calendar.events.owned` and `calendar.freebusy` on the booking user, Meet enabled, a test calendar, the key bundle (with `subject`, `calendar_id` and `test_calendar_id`) pasted into `ZENETLABS_PROD_GOOGLE_CALENDAR` (RB 6), then `/api/health` shows `booking:true`. Review `book.ts`, the call windows and the 14-day horizon (`booking-rules.ts`), the "free, no commitment" wording, and do the `[TEST]` acceptance booking on a preview alias built with the flag on. Key hygiene: rotate by creating a new key, updating the secret and deleting the old key; revoke by deleting the key or the delegation entry.
- **Calculator.** Review every coefficient, cap, the discount and uplift rules, the maintenance thresholds, the "Request a call" wording and the privacy sentence (`pricing-rules.ts`). Flip in RB 9.
- **Assistant.** Confirm the Workers plan (Free: 10,000 neurons a day account-wide; Paid: raise `dailyNeuronBudget`); optionally create an AI Gateway (logs off, cache off; send the name); review the prompt, widget copy, notice, retention and budget; run the question set on a preview alias; then flip. If the first deploy with the `AI` binding fails with an authentication error naming AI, add Account, Workers AI, Read to the deploy token.
- **Voice** (needs booking first). ElevenLabs account on a plan with enough minutes, DPA accepted and training opt-outs checked; an API key restricted to Agents with a credit limit into `ZENETLABS_PROD_ELEVENLABS_API_KEY`; a tool secret into `ZENETLABS_PROD_ELEVENLABS_TOOL_SECRET`; `pnpm voice:plan` then `pnpm voice:apply` (prints the two agent ids); optionally the GitHub `production` environment secret `ELEVENLABS_API_KEY` so every deploy re-syncs the agents; Bot Fight Mode off for `zenetlabs.com`; review the spoken messages, caps (30 calls a day, 5 minutes each, up to about US$360 a month at the cap) and the model; confirm the ElevenLabs DPA and EU-US data transfer wording on the privacy pages; then flip.
- **WebMCP origin-trial token** (optional): register at the Chrome Origin Trials console for `https://zenetlabs.com`, put the token in `webmcp.originTrialToken` (`low` PR), record the expiry.

## P3: platform and housekeeping

- **Workers plan** (the check the runbook points to from sections 1 and 8). Confirm in the dashboard (Workers & Pages, Plans) whether the account is on Free or Paid. If it is Free: about 2 ms of CPU headroom on a cold start, a shared 10,000-neuron cap, 5 crons per account, 3-day logs and D1 daily limits, and Paid is recommended before the assistant or voice go live. The CPU figures on 2026-11-01 (RB 16) show p99 values far above 10 ms with no `exceededCpu` status, which a Free account should not allow, so it may already be Paid.
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

203 markers in 61 files. Regenerate before each review session with:

```sh
git grep -n 'TODO(albert)' -- . ':!*.test.*' ':!*.md'
```

### Site config (13)

- `site.config.ts:41` GA4 web-stream measurement ID (G-XXXXXXXXXX); follow docs/analytics.md "Activation"
- `site.config.ts:43` set true after reviewing src/content/pricing-rules.ts
- `site.config.ts:45` set true once the Google Calendar secret exists and /api/health reports booking:true (docs/ai-assistant.md "Booking activation")
- `site.config.ts:47` set true after the model bake-off passes (docs/ai-assistant.md "Activation")
- `site.config.ts:52` optional WebMCP origin-trial token for https://zenetlabs.com (docs/ai-assistant.md "WebMCP")
- `site.config.ts:56` set true once the ElevenLabs agents exist and /api/health reports voice:true (docs/ai-assistant.md "Voice activation"); needs booking.published first
- `site.config.ts:58` the agent ids printed by pnpm voice:apply
- `site.config.ts:128` confirm the lead notification address
- `site.config.ts:131` set { teamDomain: 'https://<team>.cloudflareaccess.com', aud } once the Access app exists
- `site.config.ts:140` confirm the model after the bake-off (pnpm eval:chat against a preview alias)
- `site.config.ts:142` AI Gateway name (docs/ai-assistant.md "AI Gateway"); null calls Workers AI directly
- `site.config.ts:144` raise on Workers Paid; the Free plan stops at 10,000 neurons a day for the whole account
- `site.config.ts:151` the most voice calls a UTC day can start, previews included, across both locales. At most 30 x 5 minutes = 150 minutes a day: about US$12 a day at ...

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

### Service pages and the services hub (54)

- `src/content/en/service-pages/agents.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/agents.ts:24` confirm the timeline
- `src/content/en/service-pages/agents.ts:29` confirm the timeline
- `src/content/en/service-pages/agents.ts:99` confirm the case
- `src/content/en/service-pages/agents.ts:121` confirm the data-access promises
- `src/content/en/service-pages/automation.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/automation.ts:23` confirm the timeline
- `src/content/en/service-pages/automation.ts:28` confirm the timeline
- `src/content/en/service-pages/automation.ts:94` confirm the case
- `src/content/en/service-pages/automation.ts:125` confirm Zapier, Make and n8n
- `src/content/en/service-pages/integrations.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/integrations.ts:23` confirm the timeline
- `src/content/en/service-pages/integrations.ts:28` confirm the timeline
- `src/content/en/service-pages/integrations.ts:98` confirm the case
- `src/content/en/service-pages/software.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/en/service-pages/software.ts:23` confirm the timeline
- `src/content/en/service-pages/software.ts:28` confirm the timeline
- `src/content/en/service-pages/software.ts:98` confirm the case
- `src/content/en/service-pages/software.ts:127` confirm the stack and the hosts
- `src/content/en/service-pages/training.ts:1` review this page: lead times, the case, the FAQ answers
- `src/content/en/service-pages/training.ts:21` confirm the lead time
- `src/content/en/service-pages/training.ts:26` confirm the formats
- `src/content/en/service-pages/training.ts:55` legal review of the safe-use wording
- `src/content/en/service-pages/training.ts:81` where can workshops be held in person?
- `src/content/en/service-pages/training.ts:98` confirm the case
- `src/content/en/services-hub.ts:21` review the "small AI consultancy" claim
- `src/content/en/services.ts:79` tier names and scope
- `src/content/es/service-pages/agents.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/agents.ts:24` confirm the timeline
- `src/content/es/service-pages/agents.ts:29` confirm the timeline
- `src/content/es/service-pages/agents.ts:99` confirm the case
- `src/content/es/service-pages/agents.ts:125` confirm the data-access promises
- `src/content/es/service-pages/automation.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/automation.ts:23` confirm the timeline
- `src/content/es/service-pages/automation.ts:28` confirm the timeline
- `src/content/es/service-pages/automation.ts:94` confirm the case
- `src/content/es/service-pages/automation.ts:125` confirm Zapier, Make and n8n
- `src/content/es/service-pages/integrations.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/integrations.ts:23` confirm the timeline
- `src/content/es/service-pages/integrations.ts:28` confirm the timeline
- `src/content/es/service-pages/integrations.ts:102` confirm the case
- `src/content/es/service-pages/software.ts:1` review this page: timelines, the case, the FAQ answers
- `src/content/es/service-pages/software.ts:23` confirm the timeline
- `src/content/es/service-pages/software.ts:28` confirm the timeline
- `src/content/es/service-pages/software.ts:98` confirm the case
- `src/content/es/service-pages/software.ts:127` confirm the stack and the hosts
- `src/content/es/service-pages/training.ts:1` review this page: lead times, the case, the FAQ answers
- `src/content/es/service-pages/training.ts:21` confirm the lead time
- `src/content/es/service-pages/training.ts:26` confirm the formats
- `src/content/es/service-pages/training.ts:55` legal review of the AI Act article 4 sentence
- `src/content/es/service-pages/training.ts:81` where can workshops be held in person?
- `src/content/es/service-pages/training.ts:98` confirm the case
- `src/content/es/services-hub.ts:21` review the "consultoría pequeña" claim
- `src/content/es/services.ts:79` tier names and scope

### Es landing pages (Holded, Verifactu, travel agencies) (30)

- `src/content/es/holded-pairs/holded-hubspot.ts:1` review this page: timelines, the Zapier comparison, every Holded/HubSpot API claim (re-check holded.com/developers before deploy)
- `src/content/es/holded-pairs/holded-hubspot.ts:24` confirm the timeline
- `src/content/es/holded-pairs/holded-hubspot.ts:29` confirm the timeline
- `src/content/es/holded-pairs/holded-hubspot.ts:79` re-check on holded.com/developers before deploy
- `src/content/es/holded-pairs/holded-hubspot.ts:118` re-check the limits per plan on holded.com/developers
- `src/content/es/holded-pairs/holded-hubspot.ts:146` confirm API access per plan
- `src/content/es/holded-pairs/holded-prestashop.ts:1` review this page: timelines, the plugin comparison, every Holded/PrestaShop API claim (re-check holded.com/developers before deploy)
- `src/content/es/holded-pairs/holded-prestashop.ts:24` confirm the timeline
- `src/content/es/holded-pairs/holded-prestashop.ts:29` confirm the timeline
- `src/content/es/holded-pairs/holded-prestashop.ts:85` re-check on holded.com/developers before deploy
- `src/content/es/holded-pairs/holded-prestashop.ts:109` asesoría check
- `src/content/es/holded-pairs/holded-prestashop.ts:125` re-check the limits per plan on holded.com/developers
- `src/content/es/holded-pairs/holded-prestashop.ts:142` confirm the plugin's current refund handling
- `src/content/es/holded-pairs/holded-prestashop.ts:149` confirm the supported versions
- `src/content/es/holded-pairs/holded-woocommerce.ts:1` review this page: timelines, the plugin comparison, every Holded/WooCommerce API claim (re-check holded.com/developers before deploy)
- `src/content/es/holded-pairs/holded-woocommerce.ts:24` confirm the timeline
- `src/content/es/holded-pairs/holded-woocommerce.ts:29` confirm the timeline
- `src/content/es/holded-pairs/holded-woocommerce.ts:85` re-check on holded.com/developers before deploy
- `src/content/es/holded-pairs/holded-woocommerce.ts:124` re-check the limits per plan on holded.com/developers
- `src/content/es/holded-pairs/holded-woocommerce.ts:141` confirm the plugin's current refund handling
- `src/content/es/travel-agencies.ts:1` review every claim; the REAV sentence needs the asesoría's wording
- `src/content/es/travel-agencies.ts:27` confirm the agency size we serve
- `src/content/es/travel-agencies.ts:29` confirm the timeline
- `src/content/es/travel-agencies.ts:79` REAV wording from the asesoría
- `src/content/es/verifactu-page.ts:1` legal review of the whole page; re-check the BOE (RD 1007/2023 consolidated text) and the AEAT before each deploy and bump verifactuDates.checkedOn...
- `src/content/es/verifactu-page.ts:32` confirm Holded shows its declaración responsable for the current version
- `src/content/es/verifactu-page.ts:37` confirm the timeline
- `src/content/es/verifactu-page.ts:64` confirm the producers' date
- `src/content/es/verifactu-page.ts:131` confirm Holded shows its declaración responsable for the current version
- `src/content/es/verifactu.ts:1` re-check the BOE (RD 1007/2023, consolidated text) and the AEAT before each deploy; if the postponement is published, rewrite the strip and the FAQ...

### Case studies (14)

- `src/content/en/case-pages/viatsy.ts:1` confirm every claim; the figures live in cases.ts as [X]
- `src/content/en/cases.ts:10` confirm
- `src/content/en/cases.ts:18` [X]
- `src/content/en/cases.ts:25` [X]
- `src/content/en/cases.ts:42` confirm
- `src/content/en/cases.ts:50` [X]
- `src/content/en/cases.ts:57` [X]
- `src/content/es/case-pages/viatsy.ts:1` confirm every claim; the figures live in cases.ts as [X]
- `src/content/es/cases.ts:10` confirm
- `src/content/es/cases.ts:18` [X]
- `src/content/es/cases.ts:25` [X]
- `src/content/es/cases.ts:42` confirm
- `src/content/es/cases.ts:50` [X]
- `src/content/es/cases.ts:57` [X]

### Legal and consent (16)

- `src/content/en/consent.ts:3` review the banner and settings copy
- `src/content/en/legal-clauses.ts:3` review (Spanish legal clauses for the Singapore company; templates take {legalName}, {taxId}, {address})
- `src/content/en/legal-clauses.ts:14` confirm
- `src/content/es/consent.ts:3` review the banner and settings copy
- `src/content/es/entity.ts:7` Spanish fiscal address. Setting it moves every es page to this entity (footer, legal pages, form consent, JSON-LD). In the same commit, bump every ...
- `src/content/es/legal-clauses.ts:3` review (Spanish legal clauses for the sole trader; templates take {legalName}, {taxId}, {address})
- `src/content/es/legal-clauses.ts:14` confirm
- `src/routes/{-$locale}/-legal/cookies-en.tsx:15` legal review (R7 GA4, consent, first-touch)
- `src/routes/{-$locale}/-legal/cookies-es.tsx:15` legal review (R7 GA4, consent, first-touch)
- `src/routes/{-$locale}/-legal/legal-notice-es.tsx:1` owner legal review (both entity variants, and the Precios clause)
- `src/routes/{-$locale}/-legal/privacy-en.tsx:19` legal review (R6 storage, attribution, retention; R7 GA4, consent, first-touch; R9 Google Calendar bookings; R10 assistant, Workers AI, transcripts...
- `src/routes/{-$locale}/-legal/privacy-en.tsx:191` match the GA4 retention setting
- `src/routes/{-$locale}/-legal/privacy-es.tsx:20` legal review (R6 storage, attribution, retention; R7 GA4, consent, first-touch; R10 assistant, Workers AI, transcripts, retention; R12 voice, Eleve...
- `src/routes/{-$locale}/-legal/privacy-es.tsx:189` match the GA4 retention setting
- `src/routes/{-$locale}/-legal/privacy-extras-en.tsx:140` confirm ElevenLabs' DPA covers the plan and whether its EU–US Data Privacy Framework certification applies
- `src/routes/{-$locale}/-legal/privacy-extras-es.tsx:141` confirmar que el DPA de ElevenLabs cubre el plan y si su certificación del Marco de Privacidad de Datos UE-EE. UU. aplica

### Assistant, voice and WebMCP copy and rules (10)

- `src/content/en/chat.ts:3` review the widget copy
- `src/content/en/voice.ts:4` review the voice copy
- `src/content/en/webmcp.ts:3` review the WebMCP tool titles, the agent-facing notes and the confirmation dialog copy
- `src/content/es/chat.ts:3` review the widget copy
- `src/content/es/voice.ts:4` revisar el texto de voz
- `src/content/es/webmcp.ts:3` review the WebMCP tool titles, the agent-facing notes and the confirmation dialog copy
- `src/server/chat/prompt.ts:13` review the assistant's rules and tone
- `src/server/voice/agent-config.ts:18` review the spoken messages. Neither promises a booking while
- `src/server/voice/prompt.ts:12` review the voice rules and tone
- `src/server/voice/settings.ts:3` review the call length, the model, the voices and the retention

### Home, pricing, about, FAQ, founder, booking and emails (23)

- `src/content/booking-rules.ts:14` confirm the call windows (Europe/Madrid wall clock, ISO weekdays 1-7).
- `src/content/booking-rules.ts:16` confirm the 14-day booking horizon.
- `src/content/en/about.ts:16` confirm the studio description
- `src/content/en/about.ts:29` confirm
- `src/content/en/about.ts:41` confirm
- `src/content/en/book.ts:3` review the copy, including "free, no commitment" and the call being the step before the paid diagnostic
- `src/content/en/faq.ts:1` review answers
- `src/content/en/founder.ts:11` founder photo (WebP ≤ 40 KB, 2× the rendered size) under public/, then set { src, width, height }
- `src/content/en/founder.ts:13` LinkedIn / GitHub URLs
- `src/content/en/home.ts:121` confirm the founder section title
- `src/content/en/home.ts:144` review the voice copy
- `src/content/en/pricing.ts:21` confirm every list
- `src/content/en/pricing.ts:83` confirm
- `src/content/en/pricing.ts:85` confirm
- `src/content/es/book.ts:3` revisar el texto, incluido "gratis, sin compromiso" y que la llamada sea el paso previo al diagnóstico de pago
- `src/content/es/faq.ts:1` review answers
- `src/content/es/founder.ts:11` founder photo (WebP ≤ 40 KB, 2× the rendered size) under public/, then set { src, width, height }
- `src/content/es/founder.ts:13` LinkedIn / GitHub URLs
- `src/content/es/home.ts:79` confirm Holded shows its declaración responsable for the current version
- `src/content/es/home.ts:161` revisar el texto de voz
- `src/content/es/pricing.ts:21` confirm every list
- `src/server/lead-emails.ts:221` review the booking confirmation copy
- `src/server/lead-emails.ts:249` review the confirmation copy and the two-working-days promise


