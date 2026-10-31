# CLAUDE.md — zenetlabs/website

Commit with /commit. Plan with plan-well. One PR per plan.

Every PR gets exactly one review pass, owned by the /commit gate: one `reviewer` run over the whole diff vs main, plus `/code-review high` only when the diff is `high`. Always pass the level explicitly. Levels: `low` = docs/copy/config, no logic; `medium` = routine UI with no form/server/external-API surface; `high` = anything touching the server entry, redirects, the contact server function, Turnstile or Resend. Never re-review after a fix round.

Decisions go through AskUserQuestion (recommended option first).

## Rules (cite by name)
- Few comments — docs live in ~/vault/projects/zenetlabs-website/.
- Never use `any`; type guards, no casts; never suppress a quality tool.
- No IIFEs; no useEffect to sync state; direct imports only (no barrels).
- Tests always (Vitest + Playwright/axe); keep existing tests updated.
- Never commit or push without explicit instruction in the same turn. No `stash`, `reset --hard`, `checkout .`, `clean`.

## Stack facts
- TanStack Start SSR (no prerender) on Worker `prod-zenet-web`; all page requests hit `src/server.ts`, which does host/legacy-path 301s first.
- Business data and the Spanish legal-notice meta live in `src/content/{en,es}/*.ts` (types in `types.ts`, built by `src/lib/content.ts`). `src/i18n/*.json` is UI chrome plus, until R2 moves it, the privacy/cookies page meta.
- Single-locale page: registry `{ slugs: { es }, route }` (`route` is required only when there is no `en` slug); the `{-$locale}` layout 404s any page missing the request locale from its `staticData.page`, so routes need no per-route guard. Legal identity always comes from `legalEntity(locale)`.
- Locales: en (unprefixed) and es via `{-$locale}`. UI copy lives in `src/i18n/{en,es}.json` (`pnpm check:i18n`); legal prose lives per locale in `src/routes/{-$locale}/-legal/*.tsx`.
- Colours only through `src/styles/tokens.css` utilities (`pnpm check:colors`). Dark mode = prefers-color-scheme.
- Service pages: `kind: 'service'` in `page-registry.ts`; every priced page (service or landing) prices from its ladder row via `serviceOf`. The language switch goes to the page's `parent` when the target locale lacks it, else home. Prices are never stored on a page.
- Es-only landing pages (Holded pairs, Verifactu, travel agencies) have ids in `LANDING_PAGE_IDS` and a `service` ladder row (`kind: 'service'` marks the five service pages); their copy loads per route from `src/content/es/…` and their names (breadcrumbs, related links) come from `servicesHub.landing`. Case figures live once, in `src/content/*/cases.ts` (`value: null` until the owner sets them).
- Slugs per locale and `lastmod` live in `src/lib/page-registry.ts` (router `rewrite`, internal path = `route`, defaulting to the English slug); never build public URLs from `location.pathname`.
- Agent surface: `/llms.txt`·`/es/llms.txt` and `/llms-full.txt`·`/es/llms-full.txt` are server routes under `{-$locale}`, built from `src/content` by `src/lib/llms.ts` and sent with `X-Robots-Tag: noindex`. A page's `.md` (`/index.md`, `/es.md`, `/pricing.md`…) is served by `src/server.ts` through the same converter as `Accept: text/markdown`, with a canonical `Link`. None of them go in the registry or the sitemap.
- Nav targets live in `src/lib/nav.ts`; `CTA_TARGET` is the single booking CTA.
- Public per-env values: `site.config.ts` (build-time, by CLOUDFLARE_ENV). Secrets: Secrets Store bindings via `import { env } from 'cloudflare:workers'`, read per request.

## Gotchas
- A route file `x.tsx` next to a folder `x/` is that folder's layout; pages that render on their own go in `x/index.tsx` plus siblings (see `services/integrations/`).
- Verifactu dates live only in `src/content/es/verifactu.ts`. Re-check the BOE and the AEAT before each deploy; when anything changes, update the module, `checkedOn` and the `verifactu` lastmod. Never write "certificado" or "VERI*FACTU" in copy.
- Page-body copy (`home`, `pricing`, `about`, `cases`, `companies`, service pages, the services hub, the landing pages and the Viatsy case page) is imported only from its route component or server-only code, never from chrome, `head()`, `scripts()`, `pages.ts` or `content.ts`. `e2e/js-budget.e2e.ts` enforces it. Service-page and hub copy loads only through `src/content/load.ts`: by dynamic import from route loaders and from `serviceBodies` in `src/lib/llms.ts`. The leak guard is the js-budget sentinels.
- A new page-content module must be added to `buildLlmsFull` and `llms.test.ts`. The `.md` URL, the head link and the llms `Pages` line come from the registry.
- Bump a page's `lastmod` when its main content, JSON-LD or links change.
- JSON-LD and inline scripts go in route `scripts()`, never `head()` (React #418). Theme-color pair lives in RootDocument.
- No Date.now()/new Date() in render. Tailwind 4: `outline-hidden`, not `outline-none`.
- workers-types shadows Element.append — use appendChild.
- Playwright: wait for `body[data-hydrated="true"]` before clicking.
- `pnpm e2e` serves whatever is in `dist/` and reuses any server already on :4173: after a `CLOUDFLARE_ENV=production pnpm build`, run `pnpm build` again and stop stale previews first (the real Turnstile key fails locally).
- A missing input is `null` plus `// TODO(albert)`, never a placeholder string. The placeholder test greps the rendered site.
- After any version bump run `pnpm dedupe`. wrangler can exit 0 without deploying — the deploy action greps for confirmation.

## Checks (local is allowed here; CI is the source of truth)
`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm knip && pnpm run doctor`
Narrow tests: `VITEST_MAX_WORKERS=2 pnpm exec vitest run <files>`.

## Deploy / rollback
Prod: `gh workflow run deploy-prod.yml --ref main` (needs a green push CI run for that SHA). Smoke: `bash scripts/smoke.sh`.
Rollback: `pnpm exec wrangler rollback --name prod-zenet-web`.
Pre-promotion check: `CLOUDFLARE_ENV=production pnpm build && pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias <name>`.
