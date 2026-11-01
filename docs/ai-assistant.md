# AI assistant: tools API, bookings and chat

This file holds the shared tool layer and the booking flow (R9) and the site chat assistant (R10, from "Chat assistant" on). WebMCP (R11, from "WebMCP" on) and the voice agent (R12) extend it.

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

## Chat assistant (R10)

A floating launcher opens a modal dialog that talks to `POST /api/chat`. The model is Workers AI through the AI SDK (`ai` plus `workers-ai-provider`, both pinned exactly); history lives in D1; there are no Durable Objects and no Agents SDK.

### Architecture

```
browser (lazy chat chunk)                         Worker (src/server.ts -> TanStack server route)
 ChatLauncher -click-> ChatPanel                   POST /api/chat -> await import(handler)
   first send: Turnstile execute('chat')            flag . origin . JSON . CHAT_LIMITER . size . zod
   POST {locale, message, page, timeZone,           model? . budget (ai_usage) .
         turnstileToken | sessionId}                new: verifyTurnstile('chat') + createSession
 <- NDJSON: session . tool . text . navigate .      old: claimTurn (cap 20, idle 2 h, max 24 h)
            confirm_booking . error . done          history (D1, last 16) . system prompt + turn tail
 BookingCard -Turnstile('book')->                   streamText(provider -> env.AI) . tools from the R9 registry
   POST /api/tools/book_meeting (+chatSessionId)    guard(sentences) -> NDJSON . persist (D1 batch) -> done
cron */10 (R6): deliverDue -> (03:00 UTC tick) purgeExpired (leads) -> purgeChats (30 d, unlinked)
```

Files: `src/server/chat/` (`handler`, `store`, `guard`, `knowledge`, `prompt`, `tools`, `usage`, `schema`, `ndjson`, `model`, `fake-model`, `route`), `src/routes/api/chat.ts`, and in the browser `src/components/chat-launcher.tsx` (entry graph, about 1 KB) plus the lazy `src/components/chat/{chat-panel,booking-card}.tsx`, `src/lib/chat-{store,client,events,session}.ts` and the per-locale copy `src/content/{en,es}/chat.ts`.

### Gate

`assistant.published` in `site.config.ts` (`true` locally, `false` in production, `TODO(albert)`), the same pattern as `booking.published`. The build-time constant `__ASSISTANT__` carries it to the client, so a dark build ships no launcher, no panel chunk and no `/api/chat` client code. While `false`: the endpoint answers `503 unavailable` before reading the body, no D1 table is touched, the privacy page says nothing about the assistant, and `/api/health` reports `assistant:false`. `assistant:true` needs the flag and a model (the `AI` binding, or the scripted model in local builds).

### Endpoint

| Step | Check | Failure (`{ ok:false, error }`, `no-store`) |
|---|---|---|
| 0 | `assistant.published` | 503 `unavailable` |
| 1 | `Origin` equals the request origin | 403 `origin` |
| 2 | `Content-Type: application/json` | 415 `unsupported` |
| 3 | `CHAT_LIMITER` per `CF-Connecting-IP` (prod 10 per minute, local 100) | 429 `rate`, `Retry-After: 60` |
| 4 | body at most 8,192 bytes | 413 `too-large` |
| 5 | zod: `locale`, `message` (1 to 1,000 chars, newline allowed, no other control character), `page` (relative path), optional `timeZone`, and exactly one of `sessionId` or `turnstileToken`. Unknown keys, such as a client history, are stripped | 400 `invalid` |
| 6 | a model exists | 503 `unavailable` |
| 7 | today's neurons under `dailyNeuronBudget` | 503 `budget` (and `ai_usage.refused + 1`) |
| 8a | new session: Turnstile action `chat`, then `createSession` | 403 `captcha` / 503 `unavailable` |
| 8b | existing session: atomic `claimTurn` (20 messages, 2 h idle, 24 h absolute) | 404 `session` / 409 `session-full` / 400 `invalid` (locale differs) |
| ok | 200 `application/x-ndjson`, `Cache-Control: no-store, no-transform`, `Content-Encoding: identity` | in-stream `error` |

Other methods answer 405 with `Allow: POST`. No CORS header is ever set.

Stream events, one JSON object per line: `session {id}` (new sessions only), `tool {name}` (status only, never arguments), `text {v}` (guarded sentences), `navigate {page, section?, href}`, `confirm_booking {proposal:{slot,topic}}`, `error {code:'unavailable'}` (the partial text stays) and always a closing `done {remaining}` after the turn is stored.

### Tools in chat

The tool set is the R9 registry, adapted in `src/server/chat/tools.ts`: the same zod schemas, minus `locale` (the page decides the language) for the read tools. `get_faq`, `get_pricing`, `estimate_project` and `check_availability` run in process (no HTTP, so `TOOLS_LIMITER` is not hit twice); their output is stripped of URLs and `check_availability` is cut to eight slots. `estimate_project` is offered only while `calculator.published`, `check_availability` and `book_meeting` only while `booking.published`. **`book_meeting` never books in chat**: its chat input is `slot` and `topic` only (no name or email ever reaches the model), it checks that the slot appears in a `check_availability` result of this conversation, and it streams `confirm_booking`. The visitor then fills in name, email and consent in the card, which posts to `POST /api/tools/book_meeting` with Turnstile action `book` and `chatSessionId`; the R9 checks (booking flag, D1 caps, holds) all apply. A linkable session (it exists and started within 24 hours, and the assistant is published) makes the booking channel `chat` and the lead `source = 'chat'` with `chat_session_id`; otherwise it is an ordinary web booking. `navigate` resolves the target on the server to a public path and streams a button; the dialog never redirects by itself.

### Guardrails

- History comes from D1 only (last 16 messages, cut at a visitor message). The request has no history field.
- Output guard (`guard.ts`, pure, table-tested), per sentence: an amount in the wrong currency or not in the official set (the ladder plus numbers in this conversation's tool outputs) replaces the sentence with the pricing sentence and adds one pricing button per turn; links and any address but `hello@zenetlabs.com` are removed or replaced; Markdown is stripped; the canary `ZL-ASSIST` or the rules header phrase replaces the sentence with the refusal and the rest of the reply is ignored. The guarded text is what is shown, stored and replayed to the model.
- Caps: 600 output tokens, 4 steps (the last forces text), 20 visitor messages per session, 10 requests a minute per IP, Turnstile per session, and the money caps below.
- Normalisation: every sentence is NFKC-normalised, stripped of invisible format characters (zero-width, bidi, soft hyphen) and of Markdown before any check runs, so none of those can hide a price, a link, an address or a leak; what is shown and stored is the cleaned text. Prices are also read in words (`4,999 Singapore dollars`, `euros 4.999`, `dólares de Singapur`), and a currency sign at the end of the previous sentence counts for the number that starts the next. The amounts a tool result may let through are its `min`/`max` fields and its price strings, not every number in it. Any dotted name that ends like a domain is removed as a link.
- Prompt injection: the website's own turn context (time, page id, messages left) comes first in the visitor's turn, then the fixed line `VISITOR MESSAGE:`, then the visitor's words; the rules say only the first block is the website's.
- Prompt: `prompt.ts` holds the rules, `knowledge.ts` serialises the content modules per locale (no URLs, at most 24,000 characters; tested). The turn tail (time, page id, messages left) never repeats client text.
- Logs: `chat: turn { session, model, ms, firstTextMs, steps, tools, inputTokens, outputTokens, neurons, guards }` and `chat: <stage> failed { session, code }`, error names only. Never message text, tool arguments, names, emails or IPs. A test sweeps every log call.

### Money caps

- **Daily budget** (`dailyNeuronBudget`, production 8,000): checked before a turn, and **reserved atomically** (`reserveNeurons`, one `INSERT ... ON CONFLICT DO UPDATE ... WHERE neurons + est <= budget RETURNING`) before the model runs, so turns in parallel cannot all pass. The reservation is `reservationFor(model)`: two steps with a 9,000-token prompt plus 600 output tokens (121 neurons on glm-4.7-flash, 180 on gemma, 488 on scout). `persistTurn` corrects `ai_usage.neurons` by `actual - reserved`.
- **Per-address daily cap** (`perAddressDailyTurns`, production 40: two full sessions): one counter per UTC day and per keyed fingerprint of the visitor address in D1 `chat_ip_usage` (migration `0004`). The fingerprint is an HMAC-SHA-256 of `day|address` keyed with the Turnstile secret that is already read for the request, truncated to 16 bytes: it cannot be reversed, nothing links it to a session or a lead, and the cron deletes rows older than yesterday. A Workers rate-limit binding cannot do this (its period is 10 or 60 seconds). The privacy text says so. Over the cap the visitor sees the same "use the contact form" fallback as for the budget (`budget`, 503).
- **Failed turns** are still billed: the usage of the steps that finished, else an estimate (prompt + history + message, times the steps taken), and a turn that crashes before the stream is billed the estimate too.

### Model, AI Gateway and budget

`serverConfig(env).assistant`: `model`, `aiGatewayName` and `dailyNeuronBudget`. Production: `@cf/zai-org/glm-4.7-flash` (thinking off through `chat_template_kwargs`), no gateway, 8,000 neurons a day. The Free plan stops at 10,000 neurons a day for the whole account, shared with every Worker on it. `usage.ts` converts token usage to neurons with the published rates (Cloudflare pricing page, checked 2026-10-30); `ai_usage` keeps one row per UTC day.

With `aiGatewayName` set, the provider is created with `gateway: { id, skipCache: true, collectLog: false }`: spend, analytics and gateway rate limits work, and prompts and replies are not logged. Turning gateway logs on needs a privacy text change first.

`workers-ai-provider` is marked deprecated by its authors in favour of `createAI` from the Agents SDK. `createAI` always routes through a gateway (defaulting to an auto-created `default` one), which breaks "direct unless `aiGatewayName` is set", so the provider stays pinned and isolated in `src/server/chat/model.ts`. Swapping it later touches that one file.

### Data and retention

D1 migrations `0003_chat.sql` and `0004_chat_ip_usage.sql`: `chat_sessions` (id, times, locale, model, start page, counters, `is_test`; **no IP address**), `chat_messages` (one AI SDK message per row as JSON, plus the guarded `shown` text) and `ai_usage`. Unlinked sessions are deleted 30 days after they start by the existing cron (`purgeChats` runs on the 03:00 UTC tick, after the lead purge); messages go by cascade. A session linked to a lead lives and dies with that lead (24 months). Erasure by session or by lead:

```sql
DELETE FROM chat_sessions WHERE id = '<session-id>';
UPDATE leads SET chat_session_id = NULL WHERE chat_session_id = '<session-id>';
```

Test sessions (non-live host or a first message starting `[TEST] `) are cleaned with `DELETE FROM chat_sessions WHERE is_test = 1`. Weekly: `SELECT day, sessions, turns, refused, neurons FROM ai_usage ORDER BY day DESC LIMIT 14`, and `SELECT id, guards FROM chat_sessions WHERE guards > 0 ORDER BY created_at DESC LIMIT 20`.

The conversation of a chat lead, or of a form lead sent after chatting, is on `/internal/leads/<id>#conversation` (and linked from the owner email). A purged one reads "Conversation no longer stored."

### Client disconnect

When the visitor closes the tab mid-turn the model is not aborted: the stream is read to its end, nothing is sent, and the turn is stored. Aborting an AI SDK stream in flight made the SDK throw inside its own pipeline (an unhandled rejection in the Worker), the cost is bounded (600 output tokens, 4 steps, the reservation above), and storing the turn keeps the transcript whole for the owner. The same goes for a leak: the rest of the reply is ignored, not aborted.

### Local and CI: the scripted model

`__CHAT_FAKE__` is a build-time constant, true when `serverConfig(env).assistant.model === 'fake'` (local builds). `model.ts` then returns `fakeChatModel()` (`MockLanguageModelV4`, keyword-scripted: price, invent, book, pricing page, ignore, leak) and production builds drop that branch and its import. CI builds production, greps the server bundle for `FAKE_ASSISTANT_SENTINEL` and checks `dist/server/wrangler.json` for the `AI` binding and `CHAT_LIMITER`. The `ai` binding exists only in `env.production`, so CI has no path to Workers AI.

### Activation

1. Owner steps first (below), then set production `assistant.published: true` in a PR and update `src/site-config.test.ts`. In the same PR bump `CONSENT_VERSION` (`src/server/lead-fields.ts`), the `updated` date of both privacy pages and `PAGES.privacy.lastmod`, and update `legal.test.tsx` to the new date: the assistant section of the privacy pages renders only when the assistant is published, so the text a visitor consents to changes at the flip, not before.
2. Preview check: `CLOUDFLARE_ENV=production pnpm build && pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias chat-check` with the flag on, then try the chat in a browser on the alias (non-live hosts mark sessions `is_test`).
3. Run the 11 EN and 11 ES questions from the plan (prices, discount attempt, injections, off-topic, booking) by hand and read the transcripts; delete test sessions afterwards.
4. After the first deploy, `/api/health` must show `assistant:true`.

Kill switches: `assistant.published: false` plus a deploy, `dailyNeuronBudget: 0`, or `wrangler rollback`.

### Owner steps

1. Confirm the Workers plan (Free: 10,000 neurons a day account-wide, hard cap; Paid: raise `dailyNeuronBudget`).
2. Optional AI Gateway: Dashboard, AI, AI Gateway, Create (for example `zenetlabs-chat`), logs off, cache off, an optional rate limit and spend alert; send the name.
3. If the first deploy with the `AI` binding fails with an authentication error naming AI, add Account, Workers AI, Read to the deploy token (see the vault note).
4. Review the `TODO(albert)` items: the rules and tone in `prompt.ts`, the widget copy and notice, the privacy text and the 30-day retention, the budget.

### Tests

`pnpm test` covers the guard tables, usage, schema, knowledge, prompt goldens, the D1 store and the handler (every contract step, injection, leak, price guard, caps, disconnect, PII-free logs) against a scripted `MockLanguageModelV4`. `e2e/chat.e2e.ts` and `e2e/api-chat.e2e.ts` drive the real widget and endpoint against the scripted model, with axe in both locales and colour schemes. Workers AI is never called in CI.


## WebMCP (R11)

The site registers its tools with the browser's WebMCP API, so an agent running in the visitor's browser can search the FAQ, read prices, estimate a project, check availability, propose a booking and open pages. Nothing is registered, fetched or downloaded where the browser has no WebMCP.

### Spec and browser status

Checked 2026-11-01:

- **Spec:** W3C Web Machine Learning Community Group, "WebMCP", Draft Community Group Report of 27 October 2026 (`index.bs` last changed 2026-10-27, commit `6838130ef`). Not on the W3C Standards Track. The entry point is `partial interface Document { readonly attribute ModelContext modelContext; }`, with `registerTool(tool, { signal })` (async, rejects a duplicate name with `InvalidStateError`), `getTools()` and `executeTool()`. `ToolExecuteCallbackOptions` is only `{ signal }`: there is no user-interaction API, so the booking gate is always the in-page dialog. A tool's result is serialised as JSON; a rejection reaches the agent as an opaque error, so `execute` never throws.
- **Chrome:** developer flag `chrome://flags/#enable-webmcp-testing` (146+), origin trial M149 to M156 with an extension to desktop M162 filed on 2026-09-28. `navigator.modelContext` is deprecated (M150) and absent in Chrome 156 (probe): the code prefers `document.modelContext` and falls back to `navigator.modelContext` for the 146 to 148 developer trial and polyfills. The imperative-API page was last updated 2026-10-16.
- **Local probe:** Playwright's Chrome for Testing 156 exposes `document.modelContext` only behind `--enable-blink-features=WebMCP`. It does not validate input against the schema, and `executeTool` takes the registered tool object (from `getTools()`), not its name.
- Re-check the spec and Chrome page when the trial ends.

### How it loads

`src/client.tsx` holds one guarded line: when `__WEBMCP__` is on and `'modelContext' in document` or `'modelContext' in navigator`, it imports `src/lib/webmcp/boot.ts`. No match: nothing loads, there is no chunk and no request (about 165 B gzip of entry code). `scheduleWebMcp()` then waits for the `load` event and `requestIdleCallback` (10 s timeout; `setTimeout` 2 s where it is missing), and imports `src/lib/webmcp/register.ts` (about 4.3 KB gzip), which fetches `GET /api/tools`, checks it with `isToolManifest` and registers the tools the page allows. It does not depend on the `data-hydrated` marker. The dialog is a second chunk (`src/components/webmcp-booking-dialog.tsx` through `src/lib/webmcp/mount.ts`), loaded only when `book_meeting` has a valid proposal. It mounts in its own React root on a node appended to `body`, so it needs no router context, and it uses `messages[locale]` and `WEBMCP_COPY[locale]`.

The flag is `webmcp.published` in `site.config.ts` (build-time `__WEBMCP__`). It is `true` locally and in production: the tools are read-only, booking is Turnstile-gated and visitor-confirmed, and unsupported browsers pay nothing. With it `false` the build ships no WebMCP chunk: the `client.tsx` line folds away with the dynamic import. The manifest already omits `check_availability` and `book_meeting` while `booking.published` is false, so a dark booking is never registered.

### Tools

| Tool | Title | Annotations | Runs |
|---|---|---|---|
| `get_faq`, `get_pricing`, `estimate_project`, `check_availability` | localised | `readOnlyHint` | `POST /api/tools/:name` |
| `book_meeting` | Book a 30-minute call | `consequentialHint` | pre-check, then the dialog |
| `navigate` | Go to a page | none | `src/lib/navigate-client.ts` |

Titles, the notes added to the `book_meeting` and `navigate` descriptions and the dialog copy live in `src/content/{en,es}/webmcp.ts` (typed `WebMcpCopy`), loaded per locale by the lazy `register` chunk like the consent copy. On `book_meeting` the note replaces the server's last sentence ("Only call it after the visitor has confirmed the time, name and email"): the visitor types their own details in the dialog, so the agent passes only the slot and the topic. Descriptions and input schemas come from the manifest; only the six known names are registered, so a tool added to the server is never exposed by accident. The schema is the manifest's with two changes: `locale` is removed (each call uses the page's locale, because the locale picks the market: en is SGD and the Singapore entity, es is EUR and the Spanish entity) and `name`, `email` and `company` are no longer required on `book_meeting` (the visitor supplies them). Every call returns the HTTP envelope: `{ ok: true, result }` or `{ ok: false, error, issues? }`, with the client-only errors `invalid`, `busy`, `unknown_target`, `unavailable` and `network`.

### `book_meeting` confirmation

1. The proposal (`slot` as an ISO date-time with `Z` or an offset, like the server schema, `topic`, optional `name`, `email`, `company`, `timeZone`) is validated against `src/lib/booking-limits.ts`, the one place the field limits live for the server schema, the form fields and this check. `consent`, `turnstileToken`, `website` and `attribution` from the agent are ignored.
2. `check_availability` runs for that day in that zone. A time not in the answer returns `{ status: 'rejected', reason: 'invalid_slot' }` and opens nothing; an unavailable calendar is passed through.
3. A confirmation opens in a modal `<dialog>` (`src/lib/webmcp/confirmation.ts` holds the request, one at a time): the time, editable details, the unticked consent box, the honeypot and Turnstile (`book`). Only the visitor's own Confirm posts, through the same `submitBooking` and the same endpoint as `/book`: Origin check, `BOOK_LIMITER`, Turnstile and the D1 caps all apply. One unanswered dialog at a time (`busy` for a second); once a dialog is answered, the next proposal closes it and opens a new one, so a retry after a rejection works. While a booking is being sent the dialog cannot be closed (a second Escape is not cancelable, so it is put back) and the agent always gets the real outcome; an abort during the send is remembered and applied afterwards: a booking is still reported as booked, anything else answers `cancelled` and closes. A submit without the consent box ticked is ignored. If the dialog cannot be mounted the call answers `unavailable` and nothing stays open.
4. The agent gets `declined` (Cancel, Escape, Close), `cancelled` (the agent aborted before the visitor submitted) or the booking result. A failed security check is retried by the visitor without answering the agent.
5. GA events (`book_meeting`, `generate_lead` with method `webmcp`) go through `track()`, so consent applies. The agent is answered with the server's own envelope (`submitBooking` returns it next to the outcome).

Bookings made this way are stored as channel `web`, like `/book`: setting `webmcp` would need a change to the Turnstile-verifying handler. An agent that clicks through the dialog itself is indistinguishable from a person (as on `/book`); Turnstile, the caps and the owner email bound that.

### `navigate`

`parseNavigateInput` accepts only a `PAGE_IDS` entry and, for the home page, a `NAVIGATE_SECTIONS` entry; a URL, path or anything else is `invalid`. `resolveNavigation` (the same function the chat uses) maps it to the page's own locale and returns `unknown_target` for a page that is missing in that locale or unpublished. The move is `location.assign`, scheduled one animation frame plus 250 ms (`QUARTER_SECOND_MS`) after the result is returned: a navigation started on the next task can unload the page before the agent has received the result. It stays a full-page navigation, because the site uses plain anchors; the current page is not reloaded.

### Origin-trial token (owner, optional)

Stable Chrome 149 to 156 exposes the API only to origins with a token, or behind the flag. To enable it for everyone: register the "WebMCP" trial for `https://zenetlabs.com` (the `www` host redirects, so no subdomain matching) at the Chrome Origin Trials console, put the token in `webmcp.originTrialToken` in `site.config.ts` production, run the gate at `low`, deploy, and check that `<meta http-equiv="origin-trial">` is in the production HTML. The token is public by design, expires with the trial (Chrome ignores an expired token) and never goes in the vault.

### Tests

`navigate-client`, `webmcp/{boot,tools,register,confirmation}` and the dialog component test run in the unit project. `e2e/webmcp.e2e.ts` injects a stub `modelContext` (`e2e/webmcp-stub.ts`): absence costs nothing, registration, the read tools in both markets, `navigate`, the confirmation gate (no POST before the visitor, Cancel, Escape, abort, busy, a booking on the test calendar) and axe on the open dialog. `e2e/webmcp-real.e2e.ts` runs in the `chromium-webmcp` project against Chrome's real API (`--enable-blink-features=WebMCP`) and is the drift alarm. The default project must stay without `modelContext`.

Manually: Chrome 156 with `chrome://flags/#enable-webmcp-testing` (or `--enable-blink-features=WebMCP`), then in DevTools `await document.modelContext.getTools()` and `executeTool(<tool from getTools>, input)`, or the Model Context Tool Inspector extension.
