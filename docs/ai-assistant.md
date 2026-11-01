# AI assistant: tools API and bookings

This file holds the shared tool layer and the booking flow (R9). The chat widget (R10), WebMCP (R11) and the voice agent (R12) extend it.

## Tools API

One registry, `src/server/tools/registry.ts`, defines six tools with zod input and output schemas. Chat, WebMCP and the voice webhooks all read it.

| Tool | Does | Mutates |
|---|---|---|
| `get_faq` | keyword search of the home FAQ, up to 3 answers with their URL | no |
| `get_pricing` | the official price list (or one service), formatted | no |
| `estimate_project` | the calculator estimate. `unavailable` / `not_published` while `calculator.published` is false | no |
| `check_availability` | up to 30 free 30-minute slots from a date (`from`, `to`, `timeZone`), with `more` when there are others | no |
| `book_meeting` | holds a slot, creates the Google event with a Meet link, stores a `booking` lead, sends both emails | yes |
| `navigate` | client-only (declared for schema sharing); `resolveNavigation` in `src/lib/navigate.ts` | no |

### HTTP

| Request | Answer |
|---|---|
| `GET /api/tools` | manifest `{ version, tools[] }` with `inputSchema` / `outputSchema` (JSON Schema from zod), `Cache-Control: public, max-age=300` |
| `POST /api/tools/:name` | `200 { ok: true, result }` for every tool outcome, including `unavailable` and `rejected` |
| other methods | 405 with `Allow` |
| `GET /api/health` | `{ ok, booking, toolsBearer }`; each boolean means the secret parses. No Google call |

Transport errors are `{ ok: false, error, issues? }` with `Cache-Control: no-store`:

| Status | `error` | When |
|---|---|---|
| 404 | `unknown` | no such tool, or `navigate` (client-only) |
| 401 | `auth` | an `Authorization` header is present and wrong (never falls through to the browser path) |
| 403 | `origin` | browser `book_meeting` without a same-origin `Origin` |
| 415 | `unsupported` | not `application/json` |
| 429 | `rate` | `TOOLS_LIMITER` (reads) or `BOOK_LIMITER` (booking), `Retry-After: 60` |
| 413 | `too-large` | body over 16 KiB |
| 400 | `invalid` | schema failure, with `issues: [{ path, message }]` (at most 10, never the values) |
| 403 | `captcha` | Turnstile action `book` failed |
| 503 | `unavailable` | the Turnstile secret is unreadable, or the tool threw (logged as `{ tool, code }`) |

Auth matrix:

- **Read tools:** public, `TOOLS_LIMITER` per `CF-Connecting-IP`.
- **`book_meeting` from a browser:** same-origin `Origin`, `BOOK_LIMITER`, and the body extends the tool input with `consent: true`, `turnstileToken`, `website` (honeypot, must be empty) and `attribution`. A filled honeypot gets a fake `booked` result and nothing is stored or sent.
- **`book_meeting` from a server (voice):** `Authorization: Bearer <TOOLS_BEARER_SECRET>`. Channel `voice`, no Turnstile, no per-IP limit. The D1 caps still apply. Consent is the caller's responsibility (R12).

Curl examples (local preview with `scripts/fake-services.mjs`):

```bash
curl -s localhost:4173/api/tools | head -c 300
curl -s -X POST localhost:4173/api/tools/get_pricing -H 'Content-Type: application/json' -d '{"locale":"es"}'
curl -s -X POST localhost:4173/api/tools/check_availability -H 'Content-Type: application/json' -d '{"timeZone":"Asia/Tokyo","limit":5}'
curl -s -X POST localhost:4173/api/tools/book_meeting -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <local-tools-bearer>' \
  -d '{"slot":"2027-01-12T09:00:00.000Z","name":"[TEST] Ada","email":"ada@example.com","topic":"Automate our inbox triage."}'
```

### Booking rules

`src/content/booking-rules.ts` (Europe/Madrid wall clock): Monday to Friday, 08:00-09:00 and 09:00-18:00, 30-minute slots, 15-minute buffer, at most 3 a day, at least 12 h notice, 14-day horizon. Slots are shown in the visitor's zone, hand-formatted by `src/lib/slot-format.ts` (never render `Intl` output).

Guards in D1 (`bookings`, migration `0002_bookings.sql`), one batch per hold: an overlapping active booking, the third booking of the owner day and a second booking from the same address in 24 hours each lose the hold. Holds last 120 s. Statuses: `held`, `confirmed`, `unknown`, `failed`, `expired`, `cancelled`. `unknown` means the insert response was lost and the follow-up read failed too: the event may exist, so the slot, the day and the address stay blocked until the owner checks the calendar and sets the row to `confirmed` or `cancelled`. Every status except `confirmed` is deleted after 30 days (the lead keeps the context).

### Google Calendar

Service account with domain-wide delegation impersonating the booking user. Scopes `calendar.events.owned` and `calendar.freebusy`. The token is a signed JWT exchanged at Google's token URL (RS256 through `jose`), cached per isolate. Free/busy fails closed. The event has a fixed per-locale summary and description, the visitor's email as the only attendee, `sendUpdates=all`, a Meet request and a deterministic id (`bk` + booking id) so a lost insert response can be recovered with a `get`.

The calendar secret is one JSON bundle (the downloaded key plus `subject`, `calendar_id` and an optional `test_calendar_id`). Missing, the placeholders `UNSET` and `unconfigured`, invalid JSON or a failed schema all mean "not configured": `/api/health` says `booking:false`, the tools answer `unavailable` / `not_configured` (never a 5xx) and `/book` shows the contact form. The deploy needs the Secrets Store entry to exist, so it holds the placeholder `unconfigured` until the owner edits it. An invalid bundle is parsed once per isolate and logged once. The host decides, never the name: on any non-live host (local, previews, workers.dev) free/busy, the booking and the `is_test` rows all use `test_calendar_id`; on the live host they use `calendar_id`. The acceptance booking therefore runs on a preview alias; if it runs on the live host after the flip, delete the event and the `[TEST]` rows by hand.

Error codes in Workers Logs (`booking: calendar error { op, code }`):

| Code | Meaning |
|---|---|
| `auth_unauthorized_client` | domain-wide delegation not authorised yet, or the client ID is wrong |
| `auth_access_denied` | a scope is missing from the delegation entry |
| `auth_invalid_grant` | bad key, `subject` unknown, or clock skew |
| `auth_key` | the private key does not parse |
| `dwd` | insert refused for a service account without delegation |
| `conference` | Meet could not be created (Meet off for the user, or the conference failed) |
| `freebusy_*`, `insert_*`, `network`, `timeout` | Google or network failure |

### Booking activation

`booking.published` in `site.config.ts` (true locally, false in production) gates the whole feature: the `/book` page (404, and out of the sitemap, llms and `CTA_TARGET`) and the booking API (`check_availability` and `book_meeting` answer `not_configured`, and the page loads no Google). So production stays dark even after the real secret exists. Activation is: edit the existing secret `ZENETLABS_PROD_GOOGLE_CALENDAR` (Dashboard, Secrets Store, Edit), check `/api/health` shows `booking:true`, then set the flag and deploy. Run the `[TEST] Acceptance` booking on a preview alias built with the flag on (`CLOUDFLARE_ENV=production` build with the flag set, then `wrangler versions upload --preview-alias`), or right after the flip. Owner steps G1-G11 are in the vault note (`plans/zenetlabs-redesign-r09-tools-booking.md`) and the PR description.

### Failure handling

- Only the Meet request failed on an event that exists: the booking is accepted without a link; the owner email says `Meet link: MISSING`, the visitor is told the link comes with the invitation.
- Insert definitely failed: status `failed`, slot freed, owner email "Nothing was created".
- Insert lost and the read failed: status `unknown`, owner email "may have been created, check the calendar".
- The write after the event exists fails: the visitor still gets `booked`; the write is retried twice in the background (250 ms, 1 s) and the booking id is logged on failure (`booking: store failed`), never the visitor.
- A rejected `day_full` (the day reached 3) is reported separately from `slot_taken`; both refresh the list.
- The list refresh after a taken slot is one `GET /api/book/slots` (the page's own data, same limiter as the tools). The form keeps its inputs and the old list if it fails.

### Latency guards

The token and free/busy calls are shared while in flight. Free/busy is cached 60 s once it worked; a failure of either is remembered 45 s (`failureCacheMs`), for pages and bookings alike. The `/book` render waits at most 1.5 s for availability and then shows the contact form; the API keeps its own timeouts (token 5 s, free/busy 5 s, insert 10 s).

### Tests and the fake Google

`scripts/fake-services.mjs` (port 4175) serves `/__google/token`, `/__google/calendar/v3/freeBusy` and `/__google/calendar/v3/calendars/:id/events`, and test controls: `POST /__google/__busy`, `POST /__google/__fail { op, status, count }`, `POST /__google/__mode { conference: 'pending' }`, `GET /__google/__events`, `DELETE /__google/__state`. CI never calls Google. `scripts/local-calendar-secret.mjs <store-id>` seeds the local Secrets Store with a throwaway key; the `local-secrets` action does it in CI.
