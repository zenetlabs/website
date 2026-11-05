# Runbook: zenetlabs.com operations

The single source of truth for running the site: deploy, rollback, secrets, SQL, feature flips, kill switches, incidents and retention. Feature docs ([analytics](analytics.md), [AI assistant, booking, WebMCP and voice](ai-assistant.md)) keep the design, the contracts and the feature-specific verification, and point here for procedures. The things only the owner can do are in the [owner checklist](owner-checklist.md).

Conventions: `<store-id>`, `<secret-id>`, `<version-id>`, `<alias>`, `<booking-id>`, `<session-id>`, `<outbox-id>`, `<address>` and `<now-ms>` are placeholders. Store, account, database and secret ids come from `wrangler.jsonc` or the dashboard and are never copied into docs. Commands run from the repo root with the pinned wrangler (`pnpm exec wrangler`). Every command and SQL statement below was run, or checked with `--help`, on 2026-11-01 (SQL on a local D1 seeded with `[TEST]` rows; on production only `COUNT(*)` and `EXPLAIN QUERY PLAN`, never rows).

## 1. At a glance

| Part | What |
|---|---|
| App | TanStack Start SSR on the Worker `prod-zenet-web` (`src/server.ts` is the entry: host and legacy-path 301s first, then the app). English at `/`, Spanish at `/es`. |
| Domains | 8 custom domains: apex and `www` of `zenetlabs.com`, `zenettech.com`, `zenettechnology.com` and `sabatemartinez.com`. Every host but `zenetlabs.com` answers a 301 to it. |
| Database | D1 `prod-zenet-web` (EU jurisdiction), binding `DB`, migrations in `migrations/` (0001 to 0005). |
| Analytics | Cloudflare Web Analytics (cookieless, always on). GA4 is on, consent only (`ga4Id` set; `docs/analytics.md`). |
| Email | Outbound through Resend on `send.zenetlabs.com`; inbound is Google Workspace. |
| Third parties | Workers AI (binding `AI`, assistant), Google Calendar (booking), ElevenLabs (voice). All three are dark in production. |
| Cron | One trigger, `*/10 * * * *`, production only (section 8). |
| Config | Public per-env values in `site.config.ts` (build time, by `CLOUDFLARE_ENV`); secrets in the Secrets Store, read per request. |

**The account is on Workers Paid** (confirmed in the account's subscriptions on 2026-11-05). The limits below are the Free ones the design was built to stay inside; on Paid most of them are much higher, which matches the production CPU readings in section 16. Cloudflare docs, checked 2026-11-01:

| Limit | Workers Free (reference; the account is on Paid) |
|---|---|
| CPU per request and per cron | 10 ms on Free (Error 1102, outcome `exceededCpu`) |
| Worker startup | 1 s |
| Cron triggers per account | 5, shared with every Worker |
| Requests per day | 100,000 (Error 1027) |
| Workers AI | 10,000 neurons a day for the whole account |
| D1 | daily row limits enforced since 2026-09-01 |
| Workers Logs | 3-day retention until 2026-11-30; from 2026-12-01 Observability pricing (0.5 GB a day, 7 days) |
| D1 Time Travel | 7 days on Free, 30 on Paid |

## 2. Deploy

Production deploys are manual and only from `main`:

```sh
gh workflow run deploy-prod.yml --ref main
bash scripts/smoke.sh
```

`deploy-prod.yml` runs, in order:

1. `check-ci`: the ref must be `main` and the commit must have a successful **push** run of `ci-cd.yml` ("CI passed" is the branch-protection check).
2. `security`: `pnpm audit --prod --audit-level=high` and gitleaks over the commit history.
3. `deploy`, in the `production` environment (which has no secrets or protection rules today):
   1. `CLOUDFLARE_ENV=production pnpm build`.
   2. Bundle guards: no `FAKE_ASSISTANT_SENTINEL` in `dist/server`, no `FAKE_VOICE_SENTINEL` in `dist/client` or `dist/server`, and `dist/server/wrangler.json` carries the `AI` binding, `CHAT_LIMITER`, the `ELEVENLABS_API_KEY` secret and `VOICE_LIMITER`.
   3. `wrangler d1 migrations apply DB --remote --env production` (expand-only migrations).
   4. `./.github/actions/wrangler-deploy-retry`: retries code 971 (API rate limit, up to 5 times with doubling backoff) and startup validation 10021 with CPU wording (4 attempts, 15 s apart); any other failure fails at once. A zero exit without a "Current Version ID" line is a failure, because wrangler can exit 0 without deploying.
   5. `bash scripts/smoke.sh` (retries each check 5 times, 10 s apart).
   6. Optional: `node scripts/voice-agent.mjs apply --update-only` when the `production` environment secret `ELEVENLABS_API_KEY` exists (`continue-on-error`; a failure is a warning).
   7. The sitemap walk: `PLAYWRIGHT_BASE_URL=https://zenetlabs.com pnpm exec playwright test e2e/sitemap.e2e.ts`. It checks every sitemap page (canonical, hreflang, markdown twin, JSON-LD, placeholders, fragments), every internal link and every link in the llms files.
   8. On failure, the job summary prints the rollback command.

`ci-cd.yml` (every push and PR) holds the rest of the gate: lint, `knip`, react-doctor (`--blocking error`), typecheck, tests, a production build with its guards (including **"Analytics loads only lazily"**, which fails unless `googletagmanager` appears in the `analytics-*` client chunk and nowhere else in `dist/client`), `wrangler deploy --dry-run`, the e2e suite and Lighthouse (mobile and desktop).

What a failure means:

| Step | Failure | Fix |
|---|---|---|
| `check-ci` | no green push run for the SHA | push to `main`, wait for CI, retry |
| D1 migrations | error 7403 or "Authentication error" | the deploy token lacks D1 Edit (section 4); nothing was deployed |
| Deploy | 10182 | a Secrets Store secret named in `wrangler.jsonc` does not exist (section 6) |
| Deploy | 10021 after 4 attempts | the Worker's startup CPU is over the limit; roll back and look at the last bundle growth |
| Smoke | a check named in the log | the log line says which URL or contract failed; roll back if the site is affected |
| Sitemap walk | a failing page or link | usually a content change that broke a canonical, a link or a placeholder rule |

Policy: no deploy from a laptop unless the owner approves. The fallback (what R6 used when the token lacked D1) is the same three steps by hand with the wrangler OAuth login:

```sh
CLOUDFLARE_ENV=production pnpm build
pnpm exec wrangler d1 migrations apply DB --remote --env production
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

### Checking a build before promoting it

```sh
CLOUDFLARE_ENV=production pnpm build
pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias <alias>
```

This creates an undeployed version reachable at `https://<alias>-prod-zenet-web.zenetlabs.workers.dev`. Afterwards run `pnpm build` again and stop any preview server (`pnpm e2e` serves whatever is in `dist/`).

### Preview versions and aliases

A preview alias is public, runs with the **production** secrets and D1, and Cloudflare has no API to delete a version or an alias. The only fix for an alias is to upload a new version under the same alias name. Rules:

- Probe uploads come from `CLOUDFLARE_ENV=production` builds of `main` with every feature off. A probe with a flag on is re-uploaded dark right after.
- Sessions and leads minted on a non-live host are marked `is_test`, and the test calendar is used, but a flag-on alias still spends Workers AI neurons and ElevenLabs minutes from the shared daily caps.

State on 2026-11-01: eight aliases exist (their names are in the owner's vault notes, not in this public repo). Each answers 200 and `/api/health` reports `booking:false` and `assistant:false` (`voice:false` where the key exists). Seven of them serve code from before the voice release (no `voice` key in their health). Options to close the exposure for good, owner's choice:

1. Put Cloudflare Access in front of the preview URLs (Zero Trust, Access, an application for the Worker's preview hostnames).
2. Set `"preview_urls": false` under `env.production` in `wrangler.jsonc` and deploy (Version URLs stop resolving, and `--preview-alias` probes with them).
3. Keep previews and re-upload dark after every probe (the current rule).

List aliases without printing ids:

```sh
pnpm exec wrangler versions list --name prod-zenet-web --json
```

(read only `annotations["workers/alias"]` and `metadata.created_on`).

## 3. Rollback

```sh
pnpm exec wrangler deployments list --name prod-zenet-web
pnpm exec wrangler rollback --name prod-zenet-web            # to the previous deployment
pnpm exec wrangler rollback <version-id> --name prod-zenet-web -m "reason"
```

Then run `bash scripts/smoke.sh` and check `curl -s https://zenetlabs.com/api/health`.

What a rollback does **not** undo:

- D1 migrations (they are expand-only, so an older Worker still works against the newer schema).
- Secrets Store values.
- The cron schedule: an older version without a `scheduled` handler logs errors every 10 minutes until the next deploy.
- Preview aliases.
- The ElevenLabs agent configuration (it is changed by `pnpm voice:apply` or the deploy sync, not by the Worker version).

## 4. The deploy token

"Github Action Zenet Website" is a Cloudflare **user** token stored as the repo-level GitHub secret `CLOUDFLARE_API_TOKEN`. Needed permissions (as set 2026-10-31, confirm in the dashboard):

- Account: Workers Scripts Edit, Secrets Store Edit, Account Settings Read, D1 Edit (or Write).
- Zone, on the four zones: Workers Routes Edit, Zone Read.
- Account, Workers AI Read only if a deploy asks for it (the first deploy with the `AI` binding did not).

| Error | Missing permission |
|---|---|
| 7403 or "Authentication error" on the migrate step | D1 Edit |
| "No access to the specified service" | Secrets Store |
| code 10182 | not a permission: a referenced secret does not exist |

Rotation: roll the value in the Cloudflare dashboard (My Profile, API Tokens), run `gh secret set CLOUDFLARE_API_TOKEN`, then run `deploy-prod.yml` and check that it passes. The GitHub environment secret `ELEVENLABS_API_KEY` (optional, voice) rotates the same way. The Cloudflare MCP OAuth cannot edit user tokens. Moving to an account-owned token is on the owner checklist.

## 5. D1

Tables: `leads`, `email_outbox` (0001); `bookings` (0002, widened by 0006 with the confirmation columns); `chat_sessions`, `chat_messages`, `ai_usage` (0003); `chat_ip_usage` (0004); `voice_sessions` (0005); `booking_emails`, `booking_ip_usage` (0006). A pending booking is a `held` row with a `request` and no `confirmed_at`; its `booking_emails` rows (`verify`, `cancelled`) cascade with it, and it cascades with its lead.

Workflow for a change:

```sh
pnpm exec wrangler d1 migrations create DB <name>     # then edit the new file
pnpm db:migrate:local                                  # before any local preview or e2e
```

Migrations are **expand-only**: never drop or rename a column in the same PR as the code that stops using it. CI applies them to production before deploying. Check the state with:

```sh
pnpm exec wrangler d1 migrations list DB --remote --env production
```

Time Travel (restores the whole database to a point in the last 7 days on Free, 30 on Paid; the restore is destructive and in place, and prints an undo bookmark):

```sh
pnpm exec wrangler d1 time-travel info prod-zenet-web --env production --timestamp <rfc3339>
pnpm exec wrangler d1 time-travel restore prod-zenet-web --env production --bookmark <bookmark>
```

Erased rows stay restorable inside that window.

### Ops SQL

Run with `pnpm exec wrangler d1 execute DB --remote --env production --command "<sql>"` (add `--local` to rehearse). Times are Unix milliseconds. Statements that print personal data are marked; run them only when you need the data.

Recent leads, without personal data:

```sql
SELECT id, datetime(created_at/1000,'unixepoch') AS created, locale, source, is_test FROM leads ORDER BY created_at DESC LIMIT 20;
```

Emails that did not go out (`failed` retries by itself, `dead` is final):

```sql
SELECT o.id, o.lead_id, o.kind, o.status, o.attempts, datetime(o.next_attempt_at/1000,'unixepoch') AS next_try, o.last_error FROM email_outbox o WHERE o.status IN ('failed','dead') ORDER BY o.created_at DESC;
```

Re-queue one dead email once the cause is fixed (the next 10-minute tick sends it; Resend's idempotency key is the outbox id plus a hash of the message, and Resend remembers a key for 24 hours, so inside that window a re-queue may return the earlier result without sending):

```sql
UPDATE email_outbox SET status='pending', attempts=0, next_attempt_at=<now-ms>, last_error=NULL WHERE status='dead' AND id='<outbox-id>';
```

Bookings (the first one prints the visitor's address):

```sql
SELECT slot_start, email, status, channel FROM bookings WHERE status='confirmed' AND slot_start > <now-ms> ORDER BY slot_start;
SELECT id, datetime(slot_start/1000,'unixepoch') AS slot_utc, status, channel, is_test FROM bookings WHERE status IN ('failed','unknown') ORDER BY created_at DESC LIMIT 20;
```

Pending requests (waiting for the click on the emailed link) and the booking emails that did not go out:

```sql
SELECT id, datetime(slot_start/1000,'unixepoch') AS slot_utc, channel, is_test, datetime(hold_expires_at/1000,'unixepoch') AS lapses FROM bookings WHERE status='held' AND confirmed_at IS NULL AND request IS NOT NULL ORDER BY created_at DESC LIMIT 20;
SELECT e.id, e.booking_id, e.kind, e.status, e.attempts, e.last_error FROM booking_emails e WHERE e.status IN ('failed','dead') AND e.last_error NOT IN ('expired','replaced') ORDER BY e.created_at DESC LIMIT 20;
SELECT day, count(*) AS keys, sum(sends) AS emails FROM booking_ip_usage GROUP BY day ORDER BY day DESC;
```

A `verify` row that is `dead` with `expired` or `replaced` is normal (the request lapsed, or a resend replaced it). A pending request cannot be released early; it lapses on its own after 30 minutes. A confirmed booking is cancelled from the `Cancel this booking` link in the owner email (it deletes the event with `sendUpdates=all` and emails the visitor); the SQL below is only for an `unknown` row or when the link is lost.

An `unknown` row blocks its slot, its day and its address until you check the Google Calendar and set it to `confirmed` or `cancelled`. To cancel (delete the calendar event by hand too; `cancelled` frees the slot):

```sql
UPDATE bookings SET status='cancelled' WHERE id='<booking-id>' AND status IN ('confirmed','unknown');
```

Assistant and voice usage:

```sql
SELECT day, sessions, turns, refused, neurons FROM ai_usage ORDER BY day DESC LIMIT 14;
SELECT id, guards FROM chat_sessions WHERE guards > 0 ORDER BY created_at DESC LIMIT 20;
SELECT day, COUNT(*) AS sessions FROM voice_sessions GROUP BY day ORDER BY day DESC LIMIT 14;
```

Clean up test data after an acceptance run (a lead delete cascades to its outbox rows and bookings):

```sql
DELETE FROM leads WHERE is_test = 1;
DELETE FROM bookings WHERE is_test = 1;
DELETE FROM booking_ip_usage;
DELETE FROM chat_sessions WHERE is_test = 1;
DELETE FROM voice_sessions WHERE is_test = 1;
```

`booking_emails` rows go with their bookings. `booking_ip_usage` holds only keyed fingerprints and day counters (no address), so clearing it after an acceptance run just resets the caps.

Erase everything held about one address. Addresses are stored in lower case, so use the lower-case form. Order matters: the chat and voice rows are found through the lead, which is deleted last.

```sql
DELETE FROM chat_sessions WHERE id IN (SELECT chat_session_id FROM leads WHERE email='<address>' AND chat_session_id IS NOT NULL);
DELETE FROM voice_sessions WHERE id IN (SELECT json_extract(context,'$.voice.sessionId') FROM leads WHERE email='<address>' AND context IS NOT NULL);
DELETE FROM bookings WHERE email='<address>' OR email_key='<address>';
DELETE FROM leads WHERE email='<address>';
```

A chat session in which the person only typed their address, with no lead linked to it, cannot be found by address: it is removed only by the 30-day purge (to find one earlier, search `chat_messages.shown` yourself, which prints message text). Then the parts outside D1 (section 13). Production on 2026-11-01 held no leads, bookings or sessions at all (`COUNT(*)` on every table), so no real lead has gone through the site yet.

## 6. Secrets

All secrets live in the Cloudflare Secrets Store (account-wide store shared with other products, so names carry the `ZENETLABS_PROD_` prefix; an account holds at most 100). The Worker reads each one per request, so a new value applies without a deploy. A secret named in `wrangler.jsonc` that does not exist **blocks every upload** (code 10182), which is why each one exists before the PR that binds it merges.

| Secret name | Binding | Purpose | Set by | Missing, placeholder or invalid |
|---|---|---|---|---|
| `PROD_RESEND_API_KEY` (legacy name) | `RESEND_API_KEY` | Resend send-only key for lead and booking email | owner | the lead is still stored and the form still reports success; email retries then goes `dead` (section 12) |
| `ZENETLABS_PROD_TURNSTILE_SECRET` | `TURNSTILE_SECRET_KEY` | Turnstile siteverify, and the key for the chat per-address fingerprint | owner | forms answer 503 and log `secret: unreadable`; the visitor sees the mailto fallback |
| `ZENETLABS_PROD_GOOGLE_CALENDAR` | `GOOGLE_CALENDAR` | one JSON bundle: service-account key, `subject`, `calendar_id`, optional `test_calendar_id` | owner | `unconfigured`, `UNSET`, empty or invalid JSON all mean "not configured": `booking:false`, the tools answer `unavailable`, `/book` shows the contact form, never a 5xx |
| `ZENETLABS_PROD_ELEVENLABS_TOOL_SECRET` | `TOOLS_BEARER_SECRET` | bearer the ElevenLabs agents send to `/api/tools/*` | owner (an unknown random value today) | `toolsBearer:false`; voice tool calls answer 401 |
| `ZENETLABS_PROD_ELEVENLABS_API_KEY` | `ELEVENLABS_API_KEY` | mints voice conversation tokens | owner (`UNSET` today) | `UNSET` or `unconfigured` read as not configured: `voice:false`, the mint answers 503 |

Editing a value (never type it into a flag, a chat or a note). Dashboard: Secrets Store, the secret, Edit. CLI, which prompts for the value:

```sh
pnpm exec wrangler secrets-store secret list <store-id> --remote
pnpm exec wrangler secrets-store secret update <store-id> --secret-id <secret-id> --remote
```

Public config that is **not** secret and lives in `site.config.ts`: the Turnstile site key, the Cloudflare beacon token, the GA4 id, the Access team domain and AUD, the origin-trial token and the ElevenLabs agent ids.

Rotation per secret:

- **Resend:** create a new send-only key in Resend, edit the secret, send a `[TEST]` lead from a preview alias (or watch an outbox row reach `sent`), then delete the old key. No deploy.
- **Turnstile:** Rotate Secret Key in the widget (the old one keeps working for about 2 hours), edit the secret inside that window, then submit a test form. The chat per-address counters are keyed with this secret, so they reset.
- **Google calendar:** create a new service-account key, build the new JSON bundle, edit the secret, check `/api/health`, then delete the old key. To revoke, delete the key or the domain-wide-delegation entry. To disable booking, set the value back to `unconfigured`.
- **Tools bearer:** with voice not live, `openssl rand -base64 32` and edit the secret. With voice live, edit the secret, enter both values as described below, then run `pnpm voice:apply --rotate-secret` (calls fail in between, so do it out of hours).
- **ElevenLabs API key:** create a new key, edit the secret, then revoke the old one in ElevenLabs.

Entering a secret for a script (`pnpm voice:plan`, `pnpm voice:apply`): never put the value on the command line, where it lands in shell history and the process list. Read it silently into the environment of the current shell, then run the script:

```sh
read -rs ELEVENLABS_API_KEY && export ELEVENLABS_API_KEY
read -rs ZENETLABS_TOOL_SECRET && export ZENETLABS_TOOL_SECRET
```

`unset ELEVENLABS_API_KEY ZENETLABS_TOOL_SECRET` when done.

Local development: `.github/actions/local-secrets/action.yml` is the list of the five local dummy secrets (and `scripts/local-calendar-secret.mjs <store-id>` for the throwaway Google bundle); the README points to it.

## 7. Rate limits

Workers rate-limit bindings count per location and are eventually consistent: a 429 `rate` with `Retry-After: 60` is a soft limit. The exact daily caps are D1 counts. Copied from `wrangler.jsonc`:

| Binding | Namespace | Production | Local | Used by |
|---|---|---|---|---|
| `LEAD_LIMITER` | 7301 | 5 per 60 s | 100 | `POST /api/lead` |
| `TOOLS_LIMITER` | 7302 | 30 per 60 s | 1000 | `/api/tools/*`, `GET /api/book/slots` |
| `BOOK_LIMITER` | 7303 | 5 per 60 s | 100 | `book_meeting`, the Confirm and owner-cancel POSTs |
| `CHAT_LIMITER` | 7304 | 10 per 60 s | 100 | `POST /api/chat` |
| `VOICE_LIMITER` | 7305 | 3 per 60 s | 100 | `POST /api/voice/session` |

Namespaces 7301 to 7309 are reserved for this site; the next free id is 7306 (PR5a added none). A limiter that is unavailable fails open and logs `<label>: limiter unavailable`.

The booking confirmation emails have D1 caps on top (`__SERVER__.booking.limits`, pinned by `src/site-config.test.ts`): 5 per IP fingerprint per UTC day (`booking_ip_usage`; an IPv6 address counts by its /64, as it does for every limiter key; voice skips it), 3 per mailbox per rolling 24 h (requests and resends together; `+tag` and Gmail dots count as one), 40 site-wide per UTC day (the Resend quota and the sending reputation), and a 60 s resend cooldown per booking. The address and site caps count live and test (`is_test`) rows separately, so acceptance runs on a preview alias never use up production's day. All answer `limit`, which never says which cap tripped; the server logs `booking: limit { cap: 'active' | 'address' | 'site' | 'ip' }`. To raise one, change `productionServer.booking.limits` and its test (a `high` PR).

## 8. Cron

One trigger, `*/10 * * * *`, in `env.production` only (a local or preview run never fires it). The schedule is not versioned: a rollback does not change it.

- **Every tick:** `expirePendingBookings` lapses pending requests past their 30 minutes (status `expired`, `request` nulled) and drops their unsent `verify` emails (`scheduled: booking expiry { expired, dropped }`); then `deliverDueBookingEmails` retries the due `verify` and `cancelled` emails (a verify retry mints a new link); then `deliverDue` sends the due lead outbox emails.
- **The tick between 03:00 and 03:10 UTC** also runs, in order (a missed tick skips that day's purge until the next day's): `purgeCalendarEvents` (up to 50 `confirmed` or `unknown` bookings a day whose lead is older than 730 days, the least recently tried first: the event is deleted with `sendUpdates=none`, 204, 404 and 410 set `event_deleted_at`; a row whose calendar does not exist, such as a test row without `test_calendar_id`, is skipped, and a failed or skipped row is marked `purge_tried_at` so the others go first next day; `scheduled: calendar purge { due, deleted, failed, skipped }`, an error if anything failed; `scheduled: calendar purge skipped` when no calendar secret parses at all and rows are due), then the backstop (`scheduled: calendar events past the backstop { bookingIds }`, an error: leads older than 760 days go in this run even though their events still exist; delete those events by hand), `purgeExpired` (leads older than 730 days, except those whose booking still has an event, up to the 760-day backstop; bookings that are not `confirmed` or `unknown` after 30 days), the daily summary log (`scheduled: daily summary`, an error if owner emails or booking emails are dead), the `booking_ip_usage` days before yesterday, `purgeChats` (unlinked chat sessions after 30 days; `chat_ip_usage` before yesterday) and `purgeVoiceSessions` (30 days).
- **Quota:** 5 cron triggers per account on Free, shared with every other Worker; the account is on Workers Paid, where the limit is higher.
- **Where to look:** Workers Logs, search `scheduled:`; the dashboard shows cron events under the Worker's Settings, Triggers.

## 9. Feature flags and activation

Every recipe below was dry-run on 2026-11-01: the flag was set in the production block of `site.config.ts` (or `entity.ts`), `CLOUDFLARE_ENV=production pnpm build` and the CI guard commands were run, the production build was served locally and every sitemap page's `<main>`, JSON-LD and header were compared with the flag-off build, `pnpm test` showed which tests pin the dark state, and the edit was reverted by hand. Review levels follow the `CLAUDE.md` table: every flip that turns on a form, server, D1, Turnstile or external-API surface is `high`; only the origin-trial token (a config value on a feature that is already live) is `low`. A flip PR is **one flag, serialised**: calculator, GA4, assistant and voice each bump `CONSENT_VERSION`, the privacy `updated` dates and `PAGES.privacy.lastmod`, so parallel flips conflict. Review level is passed explicitly to the `/commit` gate (`CLAUDE.md`).

| Flag | File | Production | Gates | Kill switch (section 10) |
|---|---|---|---|---|
| `booking.published` | `site.config.ts` | `false` | `/book` and `/es/reservar`, the booking tools, `CTA_TARGET` | secret to `unconfigured`, or the flag |
| `calculator.published` | `site.config.ts` | `false` | both calculator URLs, links to them, `estimate_project` | the flag |
| `ga4Id` | `site.config.ts` | set (`null` turns GA4 off) | banner, consent, GA4, the legal-page variants | the flag |
| `assistant.published` | `site.config.ts` | `false` | the launcher, the panel, `POST /api/chat`, the privacy section | the flag or the budget |
| `voice.published` and `voice.agents` | `site.config.ts` | `false`, ids `null` | the voice callout, the mint, the bearer tools, `microphone=(self)` | ElevenLabs, or the flag |
| `webmcp.published`, `webmcp.originTrialToken` | `site.config.ts` | `true`, `null` | the WebMCP chunk, the origin-trial meta tag | the flag |
| `access` | `site.config.ts` (`productionServer`) | set (team domain and AUD) | `/internal/*` (404 without it) | set it back to `null` |
| Spanish entity `address` | `src/content/es/entity.ts` | `null` | which entity every `es` page names | none (a legal fact) |

Every recipe ends the same way: after the deploy run `bash scripts/smoke.sh`, check `curl -s https://zenetlabs.com/api/health`, resubmit `sitemap.xml` in Search Console and Bing, and (when pages appeared or changed) run Lighthouse on them.

**What to run before opening any flip PR:** `CLOUDFLARE_ENV=production pnpm build`, the guards of the `build-prod` job in `ci-cd.yml`, `pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json`, then `pnpm build` again (`pnpm e2e` serves whatever is in `dist/`), then the full gate in `CLAUDE.md`. The failing tests named below are the tests that pin the dark state: each flip PR rewrites them to the new state.

### `booking.published` (level `high`: it turns on the Turnstile-gated booking form, the Google Calendar API and D1 booking rows, even though the diff is only config, tests, `lastmod` and a regenerated JSON)

1. Owner: G1 to G11 ([owner checklist](owner-checklist.md), P2), the secret `ZENETLABS_PROD_GOOGLE_CALENDAR` edited (section 6), `curl -s https://zenetlabs.com/api/health` shows `"booking":true` (booking stays dark while the flag is false).
2. Acceptance first, on a preview alias built with the flag on (a non-live host uses the test calendar and marks rows `is_test`): `CLOUDFLARE_ENV=production pnpm build` with the flag set, `pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias <alias>`, then in the Orca browser (real Turnstile): a `[TEST] Acceptance` request on `/book` with a mailbox the owner reads, the pending panel, the verify email in the inbox (not spam) with a link to the **alias** origin; `curl -s` and `curl -sI` the link and check the row stays pending (`SELECT status, confirmed_at FROM bookings WHERE is_test=1`); open it, press Confirm, check the event on the test calendar with Meet, the booked email and the owner email with the cancel line; repeat on `/es/reservar` and use the owner's cancel link (event deleted, Google's and our cancellation emails); re-POST a used Turnstile token with `curl` (`captcha`); resend once for the cooldown and the rotation; a disposable address gets `email_not_accepted`. Then clean up (section 5) and **re-upload a dark build under the same alias**.
3. The flip PR: production `booking: { published: true }`. Update the tests that pin dark: `src/site-config.test.ts`, `src/lib/{llms,markdown-response,nav,navigate-client,page-registry,seo}.test.ts`, `src/routes/{locale-layout,robots-sitemap}.test.ts`. Regenerate the voice agent file (`VITEST_MAX_WORKERS=2 pnpm exec vitest run src/server/voice/agent-config.test.ts -u`; the agents gain the booking tool).
4. Bumps: `lastmod` for `book` and for every page whose `<main>` changes (the CTA now points to `/book`): all registry pages except privacy, cookies and the aviso legal (25 pages). No `CONSENT_VERSION` bump: the privacy text does not depend on this flag. The header changes on every page (CTA) but is not page content.
5. After the deploy: `/book` and `/es/reservar` answer 200 and are in the sitemap and llms files; the manifest lists six tools; `check_availability` returns slots; CTAs go to `/book`; one real booking by the owner as proof, then delete the event; Lighthouse on `/book` and `/es/reservar`.

### `calculator.published` (level `high`: it bumps `CONSENT_VERSION`)

1. Owner reviews every coefficient in `src/content/pricing-rules.ts` (the `TODO(albert)` markers there).
2. The flip PR: production `calculator: { published: true }`; update `src/site-config.test.ts`, `src/components/service-ladder.test.tsx`, `src/lib/{calculator-flag,llms,markdown-response,page-registry,seo,structured-data}.test.ts`, `src/routes/{locale-layout,robots-sitemap}.test.ts`; regenerate the voice agent file (the estimate tool changes). Bump `PRICING_RULES.version` and the goldens if any coefficient changed.
3. The legal sentences already exist behind the build-time constant `__CALCULATOR__` (derived from the same flag): `CalculatorUse` in `privacy-extras-{en,es}.tsx` (the answers travel in the page URL; the address sent to GA drops them) and the estimate line in the aviso legal's "Precios" section. The flip makes them render, so only the bumps remain: `CONSENT_VERSION` (`src/server/lead-fields.ts`), the `updated` date of both privacy pages and of the aviso legal, `PAGES.privacy.lastmod`, `PAGES.legalNotice.lastmod` and the date assertion in `legal.test.tsx`.
4. `lastmod` for `calculator`, `pricing` and `home` (the `<main>` of `/`, `/pricing`, `/es` and `/es/precios` change; no JSON-LD changes).
5. After the deploy: both URLs 200 and listed in the sitemap and llms; a result URL renders; `estimate_project` returns an estimate; Lighthouse on a result URL.

### `ga4Id` (level `high`: it bumps `CONSENT_VERSION` and changes CI guards)

1. Owner creates the property ([analytics.md](analytics.md) section 5) and hands over the measurement ID.
2. The flip PR: production `ga4Id: 'G-XXXXXXXXXX'`.
3. **CI guard (done 2026-11-05):** `.github/workflows/ci-cd.yml`, job `build-prod`, step "Analytics loads only lazily" replaced the old "ships no analytics code" grep: it fails if no client chunk contains `googletagmanager` or if one outside `assets/analytics-*` does. `scripts/smoke.sh` now expects `'consent','default'` in the HTML of `/` and `/es` and keeps "no Google tag" (the HTML carries no tag before consent). To turn GA4 off again, set `ga4Id: null` and revert both.
4. Update `src/components/consent-manager.test.tsx` and `src/lib/pages.test.ts`. Set `updated` in `cookies-{en,es}.tsx` and `privacy-{en,es}.tsx`, `PAGES.cookies.lastmod` and `PAGES.privacy.lastmod`, `CONSENT_VERSION` and the date assertion in `legal.test.tsx`. The `<main>` of `/privacy`, `/cookies`, `/es/privacidad` and `/es/cookies` changes; nothing else does.
5. After the deploy: Tag Assistant, DebugView and the `_gcl_*` cookie check (analytics.md section 6), `bash scripts/smoke.sh`.

### `assistant.published` (level `high`)

1. Owner: raise `dailyNeuronBudget` to the spend wanted (the account is on Workers Paid), optional AI Gateway name, review the prompt and copy ([owner checklist](owner-checklist.md), P2). If a deploy with the `AI` binding fails naming AI, add Account, Workers AI, Read to the deploy token.
2. Preview check with the flag on (`--preview-alias <alias>`), the 11 EN and 11 ES question set by hand, read the transcripts, delete the test sessions, **re-upload dark**.
3. The flip PR: production `assistant: { published: true }`; update `src/site-config.test.ts` (the only failing test in the dry run). Set `dailyNeuronBudget` and `aiGatewayName` if decided.
4. Bumps: the assistant privacy section now renders, so `CONSENT_VERSION`, the `updated` date of both privacy pages, `PAGES.privacy.lastmod` and the `legal.test.tsx` date.
5. After the deploy: health `assistant:true`; the smoke chat lines switch to the 400 and 403 pair; one `[TEST]` chat on production, then delete the session; an `ai_usage` row appears; CPU in `wrangler tail`.

### `voice.published` (level `high`; needs `booking.published` first)

1. Owner: the ElevenLabs steps in the [owner checklist](owner-checklist.md) (account, API key into `ZENETLABS_PROD_ELEVENLABS_API_KEY`, tool secret into `ZENETLABS_PROD_ELEVENLABS_TOOL_SECRET`, Bot Fight Mode off), then enter the key and the tool secret with `read -rs` as in section 6, then `pnpm voice:plan` and `pnpm voice:apply`, which prints the two agent ids.
2. Acceptance calls per locale on a preview alias built with the flag on ([ai-assistant.md](ai-assistant.md), Voice, Activation). A preview call spends the same daily cap; **re-upload dark** afterwards.
3. The flip PR: production `voice.published: true` and `voice.agents` with the two ids; update `src/site-config.test.ts`, `src/lib/{security-headers,voice-entry}.test.ts`, `src/server/tools/http.worker.test.ts` and regenerate the agent file.
4. Bumps: `CONSENT_VERSION`, the `updated` date of both privacy pages, `PAGES.privacy.lastmod`, `PAGES.home.lastmod` (the contact section gains the callout), and the `legal.test.tsx` date. `Permissions-Policy` becomes `microphone=(self)`.
5. After the deploy: health `voice:true`, the headers on `/`, the callout on the home pages, one test call, and the ElevenLabs agent sync step green (or run `pnpm voice:apply`).

### `webmcp.originTrialToken` (level `low`)

1. Owner registers the trial ([ai-assistant.md](ai-assistant.md), WebMCP) and sends the token.
2. The PR: production `originTrialToken`, and `src/site-config.test.ts`. No page changes.
3. After the deploy: `<meta http-equiv="origin-trial">` is in the production HTML, stable Chrome exposes `document.modelContext`, record the expiry date.

### `access` (level `high` by the `CLAUDE.md` table, which names Access). Done on 2026-11-05

1. Owner creates the Access application `zenetlabs-internal` with destinations `zenetlabs.com/internal` and `zenetlabs.com/internal/*` (reusable policy `operators`: one email, 24 h session) and sends the team domain and AUD.
2. The PR: `productionServer.access: { teamDomain, aud }` only; no test fails (the dry run was green).
3. After the deploy: `/internal/leads` and `/internal/leads.csv` answer 302 to the team domain (locally the dry run answered 403 without a JWT); a browser login lists the leads. `/internal%2Fleads` is not fronted by Access; only the Worker blocks it, with a 403. Preview aliases uploaded after this deploy answer 403 on `/internal`; older dark aliases answer 404.

### Spanish entity address (level `high`: the consent sentence names the entity). Done on 2026-11-05

Applied in the legal-draft PR (address set, tests, voice agents, smoke line and the bumps below); kept as a record.

1. Owner supplies the postal address.
2. The PR: `address` in `src/content/es/entity.ts`; update `src/lib/{content,llms,structured-data}.test.ts`; regenerate the voice agent file; change the smoke line "footer names the entity" (it expects `Zenet Technology Pte. Ltd.` on `/es`, which stops being true).
3. Bumps: every `PAGES.*.lastmod` whose JSON-LD changes (18 pages: `/es`, the es service, landing, case, pricing and about pages and the three legal pages), the `updated` dates of the es legal pages, and `CONSENT_VERSION` because the `<main>` of `/es` (the form consent) and of `/es/privacidad`, `/es/cookies` and `/es/aviso-legal` change.
4. After the deploy: the footer, legal pages and JSON-LD on `/es`, a Rich Results Test on `/es`, `bash scripts/smoke.sh`.

### Recommended sequence

1. The Access application, the entity address and the legal review (independent; do them first).
2. GA4 (so the launches are measured).
3. Booking.
4. Calculator.
5. Assistant (it books through booking).
6. Voice (it needs booking).

The origin-trial token can go in at any time.

## 10. Kill switches

Fastest first. Config switches need a deploy (section 2); `wrangler rollback` needs none.

| Feature | No deploy needed | With a deploy | Last resort |
|---|---|---|---|
| Booking (page, tools, chat and voice bookings) | edit the secret `ZENETLABS_PROD_GOOGLE_CALENDAR` back to `unconfigured` (the tools answer `unavailable`, the page shows the contact form) | `booking.published: false` | rollback |
| Assistant | none (no runtime switch) | `assistant.published: false`, or `dailyNeuronBudget: 0` | rollback |
| Voice | disable the agent in ElevenLabs, or revoke the ElevenLabs API key, or rotate the tool secret | `voice.published: false`, a locale's agent id to `null`, or `dailySessions: 0` | rollback |
| Calculator | none | `calculator.published: false` | rollback |
| WebMCP | none | `webmcp.published: false` | rollback |
| GA4 and consent | none | `ga4Id: null` (also bump the cookies and privacy pages) | rollback |
| Leads | none: the contact form is the fallback; abuse is handled by Turnstile and the limiters | | rollback |
| Whole site | | | `pnpm exec wrangler rollback --name prod-zenet-web` |

## 11. Monitoring and logs

`GET https://zenetlabs.com/api/health` (uncached) returns `{ ok, booking, toolsBearer, assistant, voice }`:

| Key | True when |
|---|---|
| `booking` | the calendar secret parses (it does not depend on the `booking.published` flag) |
| `toolsBearer` | the tools bearer secret is readable and not a placeholder |
| `assistant` | `assistant.published` and the `AI` binding exists |
| `voice` | `voice.published`, an agent id for some locale, and both the ElevenLabs key and the tools bearer readable |

On demand: `bash scripts/smoke.sh` (about 150 checks, no side effects beyond a few rejected or dark-state POSTs) and the sitemap walk (`PLAYWRIGHT_BASE_URL=https://zenetlabs.com pnpm exec playwright test e2e/sitemap.e2e.ts`).

Live logs (read-only). The URLs on this site carry no personal data in query strings, but two carry a **booking token**: the visitor's confirm link (`/book?confirm=…`, `/es/reservar?confirm=…`, and `GET /api/book/confirm?confirm=…` for client navigations) and the owner's cancel link (`/api/book/cancel?t=…`). Each is a bearer credential for one booking: whoever has a confirm link can confirm that request (until it lapses, 30 minutes), whoever has a cancel link can cancel that call (until it starts). They reach Cloudflare's request logs like any URL: `wrangler tail` and Workers Logs show them for 3 days (7 from 2026-12-01), to every member of the Cloudflare account with Workers or Observability access, and to anyone holding the deploy or an Analytics token. Treat log exports and screenshots of them as secret, keep account membership to the owner, and never paste a token into an issue or a chat. The database stores only SHA-256 hashes, and the links are derived from the Turnstile secret (`TURNSTILE_SECRET_KEY`): rotating that secret invalidates every confirm and cancel link already sent (pending visitors book again; the owner uses `/internal/leads` and the SQL in section 5 to cancel).

```sh
pnpm exec wrangler tail prod-zenet-web --format json
pnpm exec wrangler tail prod-zenet-web --status error
pnpm exec wrangler tail prod-zenet-web --search 'booking:'
pnpm exec wrangler tail prod-zenet-web --search 'chat: turn'
pnpm exec wrangler tail prod-zenet-web --method POST
```

Workers Logs (dashboard, Worker, Observability) keeps the same lines for 3 days on Free (7 from 2026-12-01). The structured fields are in the line's second argument.

CPU, last 7 days, through the GraphQL API (**needs a token with Account Analytics Read; never use the deploy token**; `accountTag` is the account id from the dashboard; times are microseconds):

```graphql
query ($acc: String!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $acc }) {
      workersInvocationsAdaptive(
        limit: 100
        filter: { scriptName: "prod-zenet-web", datetime_geq: $since, datetime_leq: $until }
      ) {
        sum { requests errors }
        quantiles { cpuTimeP50 cpuTimeP99 }
        dimensions { status scriptVersion }
      }
    }
  }
}
```

Log lines (each logs error names and ids only, never message text, tool arguments, names, emails or IPs):

| Prefix | Meaning |
|---|---|
| `lead: store failed`, `lead-email: delivery failed`, `lead-email: failed`, `throttled`, `dead`, `invalid row`, `bookkeeping failed` | the lead was stored or not; the email outbox state (section 12, Resend) |
| `booking: calendar error {op, code}`, `calendar secret invalid`, `availability failed`, `store failed`, `store retry failed`, `hold lost before the outcome` | Google Calendar and the booking store; the code table is in [ai-assistant.md](ai-assistant.md) |
| `booking: limit {cap}` | a request or resend refused by a cap: `active` (the mailbox already has a pending or active booking), `address`, `site` or `ip`. A burst of `site` or `ip` is abuse; see section 7 |
| `booking: honeypot`, `booking: confirm failed`, `booking: confirm view failed`, `booking: cancel failed {bookingId, code}`, `booking: cancelled by the owner`, `booking: unreadable row` | the email-confirmation flow and the owner's cancel link |
| `booking-email: failed`, `throttled`, `delivery failed`, `bookkeeping failed` | the `booking_emails` outbox (verify and cancelled) |
| `turnstile: rejected {reason}` | a Siteverify answer refused: `action`, `hostname`, `age`, `duplicate`, `invalid` or `network` (never the token) |
| `chat: turn {…}`, `chat: <stage> failed {session, code}` | one line per assistant turn with counts; failures by stage (`model`, `tool`, `stream`, `persist`, `reservation`, `budget check`, `address count`, `link`, `session`) |
| `voice: session`, `voice: token failed`, `voice: not configured`, `voice: session not stored`, `voice: release failed`, `voice: conversation id not stored` | the voice mint |
| `tools: failed`, `tools: after-run failed`, `tools: voice session rejected`, `tools: voice session lookup failed` | the tool endpoint |
| `secret: unreadable` | a Secrets Store read failed |
| `scheduled: delivery failed`, `booking expiry`, `booking emails failed`, `calendar purge`, `calendar purge skipped`, `calendar delete failed`, `daily summary`, `daily summary failed`, `booking usage purge failed`, `chat purge`, `voice purge` (and their `failed` forms) | the cron (section 8) |
| `internal: render failed` | the Access-gated lead pages |
| `<label>: limiter unavailable` | a rate-limit binding failed open |

Other dashboards: Cloudflare Web Analytics (Core Web Vitals field data is the truth for performance), Resend Emails and Suppressions, Search Console and Bing Webmaster Tools ([analytics.md](analytics.md) sections 7 and 8).

## 12. Incident playbooks

Each one: symptom, confirm, contain, recover, proof it is over.

**Resend down, or key or domain trouble.**
Symptom: the form says sent but nobody gets email; the lead is stored. Confirm: `lead-email: delivery failed|throttled|dead` in the logs; the failed and dead outbox query (section 5). Backoff runs 10 min, 30 min, 1 h, 3 h, 6 h, then the row is `dead` after the sixth attempt (about 11 hours in total). Check Resend's Suppressions first (a suppressed recipient looks like a failure). Contain: nothing is lost, read leads with the "recent leads" SQL or `/internal/leads`. Recover: fix the key or domain, then re-queue the `dead` rows (section 5). Over when: an outbox row reaches `sent`.

**Google down, or delegation revoked.**
Symptom: `/book` shows the contact form; the tools answer `unavailable`. Confirm: `booking: calendar error {op, code}` (codes in ai-assistant.md). A failure is cached for 45 s. Contain: if the log is noisy, set the secret to `unconfigured`. Recover: fix the delegation or key, restore the secret, check `booking:true`. Over when: `check_availability` returns slots. Afterwards reconcile `unknown` rows against the calendar (section 5).

**Verify emails not arriving, or dead.**
Symptom: visitors say the link never came; the pending query shows requests lapsing unconfirmed. Confirm: `booking-email: failed|throttled` in the logs and the booking-email query (section 5); `dead` with an error other than `expired` or `replaced`. Check Resend's Suppressions and the domain's sending reputation, and the 40-a-day site cap (`booking_ip_usage` and the `verify` count for today). Contain: nothing to re-queue (a lapsed request cannot be revived); the visitor can book again or use the contact form. Recover: fix Resend, then watch a new request reach `sent`.

**The calendar purge failing.**
Symptom: `scheduled: calendar purge { failed > 0 }` at error level, or `calendar purge skipped`. Confirm: the `booking: calendar error` codes and `scheduled: calendar delete failed {bookingId, code}`. The leads stay (they are kept until their event is gone, at most 760 days), so nothing is lost and the privacy promise only waits a day or two; failing rows rotate to the back, so they never block the others. Recover: fix the delegation or secret (the Google playbook above); the next 03:00 tick retries. Over when: the line shows `failed: 0`. If an event was deleted by hand, set `event_deleted_at` on its row so the lead can go. `skipped > 0` means rows whose calendar is not in the bundle (a test row after `test_calendar_id` was removed): delete those events by hand and set `event_deleted_at`. **`scheduled: calendar events past the backstop {bookingIds}`** means the leads of those bookings were deleted at 760 days with their events still in the calendar: delete the events by hand the same day (search the calendar for `bk<booking-id>` without dashes, or the call titles) to keep the 24-month promise.

**Workers AI budget exhausted.**
Symptom: chat answers 503 `budget`, `ai_usage.refused` climbs. The cap is the self-imposed `dailyNeuronBudget` (the account is on Workers Paid, so Cloudflare sets none) and resets at 00:00 UTC. Confirm with the `ai_usage` SQL. Contain: wait for the reset, check for abuse (sessions per address, `chat_ip_usage`); the kill switch is `assistant.published: false` or `dailyNeuronBudget: 0`. To allow more spend, raise `dailyNeuronBudget` (a `low` PR).

**Turnstile failing.**
Symptom: forms answer 403 `captcha` (the visitor gets the mailto fallback); `secret: unreadable` means 503. Confirm: Cloudflare status, the widget's analytics (solve rate), the widget hostnames (`zenetlabs.com` and `zenetlabs.workers.dev`), and that the site key in `site.config.ts` matches the widget. Never bypass the check; rotate the secret only if it leaked (section 6).

**CPU limit exceeded.**
Symptom: Error 1102, status `exceededCpu` or `exceededResources` in GraphQL. The cold-isolate baseline is about 7.5 to 8 ms of framework startup, the same on every route (warm requests take about 1.3 ms); on Workers Paid the CPU limit is much higher than Free's 10 ms. Contain: if it started after a deploy, roll back. If it is a burst of cold traffic nothing quick helps. Deploy-time code 10021 is retried by the action.

**D1 daily limit or outage.**
Symptom: lead POSTs fail and the form shows the mailto fallback. Contain: nothing to do server-side; check the Free daily row limits (since 2026-09-01) and Cloudflare status. Recover when the limit resets or D1 returns.

**ElevenLabs down.** The mint answers 503 `unavailable` (the claimed row is deleted) and the voice button reports it; calls already running are ElevenLabs's. Disable the agent if it flaps.

**Daily request limit (Error 1027).** 100,000 requests a day on Free. Confirm in the GraphQL query; roll back only if a deploy caused the spike.

## 13. Data retention and erasure

| Data | Kept |
|---|---|
| Leads and their outbox rows | 730 days (purged by the 03:00 to 03:10 UTC tick) |
| Confirmed and `unknown` bookings | with their lead; a lead past 730 days waits until its calendar event is deleted |
| Bookings in any other status | 30 days |
| A pending request's name, company and topic (`bookings.request`) | until it is confirmed or lapses (30 minutes) |
| `booking_emails` | with their booking |
| `booking_ip_usage` | a day's rows go at the 03:00 UTC tick two days later |
| Unlinked chat sessions and messages | 30 days from the start; a session linked to a lead goes with the lead |
| `chat_ip_usage` | a day's rows go at the 03:00 UTC tick two days later (the purge deletes days before yesterday): about 51 hours at most |
| `ai_usage` | kept (daily aggregates, no personal data) |
| Voice sessions in D1 | 30 days |
| ElevenLabs transcripts | 30 days (`retention_days: 30`, no audio recorded) |
| Workers Logs | 3 days (7 from 2026-12-01) |
| D1 Time Travel | 7 days on Workers Free, 30 on Paid (erased rows are restorable that long); the privacy pages say up to 30 days |
| Consent record, first-touch, GA cookies | 12 months, 90 days, 13 months (browser side, [analytics.md](analytics.md)); GA4 event retention 14 months |
| Resend (sent emails: content, metadata, delivery events and logs) | 30 days on every self-serve plan ([Resend: account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)) |
| Mailbox threads about a lead | deleted by hand once a month when the last message is older than 24 months, unless a client relationship started (then for its duration plus the legal record periods: 6 years in Spain, 5 in Singapore) |
| Google Calendar call events | deleted automatically by the 03:00 tick 24 months after the booking (`purgeCalendarEvents`, `sendUpdates=none`), before the lead purge |

Monthly hand routine: in the mailbox, search lead threads (`older_than:24m` in Gmail search) and delete those whose last message is older than 24 months and that did not turn into a client relationship. Calendar events no longer need a hand routine; check the `scheduled: calendar purge` line instead.

Monthly list update (a `low` PR): `pnpm disposable:update <latest-commit-sha>` (the upstream repo is `disposable-email-domains/disposable-email-domains`), check the diff of `src/server/disposable-domains.generated.ts` for any real provider (`src/server/disposable.test.ts` lists the ones that must never appear; add a false positive to the script's `ALLOW` set), run `pnpm test`, and open the PR.

Erasure for one person: the SQL in section 5 across the tables (bookings match `email` or `email_key`); delete the Google Calendar event (before deleting the rows, or by its `bk<booking-id>` id); delete the messages in the mailbox; delete the conversation in ElevenLabs (Agents, Call history) when the lead carries `context.voice`; delete the Resend log entries if requested; then reply to the person.

## 14. Content changes

- **Prices:** `src/content/en/services.ts` and `src/content/es/services.ts`; the calculator goldens (`src/lib/estimate.test.ts`) follow, and so does the voice agent file.
- **FAQ:** one source per locale (`faq.ts`); it feeds the page, the FAQPage JSON-LD and llms.txt.
- **A page:** the registry entry (`src/lib/page-registry.ts`: slug per locale, `route`, `lastmod`), the content module, `buildLlmsFull` and `llms.test.ts`. Bump `lastmod` whenever the page's main content, JSON-LD or links change.
- **Verifactu:** re-check the BOE (RD 1007/2023 consolidated text) and the AEAT before any deploy that touches it, then update `src/content/es/verifactu.ts`, `checkedOn` and the `verifactu` `lastmod`.
- **Chat prompt, knowledge or the content they read:** re-run the manual question set on a preview alias (ai-assistant.md, Assistant activation).
- **Voice:** content, price, registry or prompt changes change the agents. Regenerate the file with `VITEST_MAX_WORKERS=2 pnpm exec vitest run src/server/voice/agent-config.test.ts -u`, commit the JSON, and let the deploy sync it (or run `pnpm voice:apply`).
- **Privacy bump rule:** a change to the consent sentence or to any privacy page bumps `CONSENT_VERSION` (`src/server/lead-fields.ts`), the `updated` date of both privacy pages, `PAGES.privacy.lastmod` and the date assertion in `legal.test.tsx`, together. Features whose privacy text renders only when published make that bump part of their flip PR.

## 15. Routine checks

- **Weekly:** `ai_usage` and `guards`; dead outbox rows; `failed` and `unknown` bookings; Workers Logs errors; Web Analytics Core Web Vitals.
- **Monthly:** Search Console coverage and hreflang; the external link check (collect every absolute link from the sitemap pages, the `.md` twins and `llms-full`, then `HEAD` each one per second per host and fall back to `GET` on 403, 405 or 429); Resend Suppressions; the alias list (section 2); the section 13 hand routine (Calendar events and mailbox threads older than 24 months).
- **Per deploy:** smoke and the sitemap walk (automatic); the Verifactu re-check when it is touched.

## 16. Baseline numbers (2026-11-01, production serving the R12 release)

- **CPU** (GraphQL `workersInvocationsAdaptive`, 7 days, microseconds): all `success` invocations 51,776, p50 0.64 ms, p99 71.3 ms; 0 errors; no `exceededCpu` or `exceededResources` status. Current version: 2,287 requests, p50 7.7 ms, p99 92.6 ms (cold starts dominate a version with little traffic); the cold-isolate baseline is about 7.5 to 8 ms, warm requests about 0.3 to 1.3 ms. `wrangler tail`, 17 requests: cpu median 9 ms, max 32 ms, all `ok`. The p90 and p99 values would exceed Free's 10 ms limit; no CPU-limit status appears because the account is on Workers Paid.
- **Lighthouse** (box, `lhci` median of 5, 14 production URLs, mobile and desktop): accessibility, best practices and SEO at 100 for every URL; performance 98 to 100 on mobile (LCP about 1.7 to 2.2 s, TBT 0 to 5 ms, CLS up to 0.029) and 100 on desktop (LCP about 0.5 to 0.6 s). Field data comes from Cloudflare Web Analytics.
- **Up-front JavaScript, gzip** (`e2e/js-budget.e2e.ts`; budget 138,601 B on every page): production build home 131,912 B, pricing 129,585 B (recorded at the voice release).
- **Smoke:** 151 checks. **Sitemap:** 30 URLs.

### Design release baselines (2026-11-03, local build of the design-evolution head, before deploy)

- **Lighthouse** (box, `pnpm lhci:mobile` and `pnpm lhci:desktop`, median of 5, 16 URLs): mobile performance 99 on every URL, accessibility, best practices and SEO 100; desktop every category 100. CLS 0 on every URL, both presets.
- **Up-front JavaScript, gzip** (`e2e/js-budget.e2e.ts`; only the 138,601 B limit is enforced): home 135,658 B (plan target ≤136,000), `/book` 137,328 B (plan target ≤137,500), `/privacy` 136,427 B, `/pricing` 131,915 B.
- **CLS:** 0 on every page type at 390 and 1440 (`e2e/cls.e2e.ts`).
- **Screenshots:** `pnpm visual` runs the opt-in `visual` Playwright project (`VISUAL=1`; `e2e/visual.e2e.ts`) against the running preview and writes full-page PNGs plus `heights.json` to `visual-shots/<VISUAL_LABEL>/` (`VISUAL_LABEL` defaults to `after`); `pnpm e2e` does not run it.
