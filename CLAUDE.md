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
- Locales: en (unprefixed) and es via `{-$locale}`. UI copy lives in `src/i18n/{en,es}.json` (`pnpm check:i18n`); legal prose lives per locale in `src/routes/{-$locale}/-legal/*.tsx`.
- Colours only through `src/styles/tokens.css` utilities (`pnpm check:colors`). Dark mode = prefers-color-scheme.
- Slugs per locale and `lastmod` live in `src/lib/page-registry.ts` (router `rewrite`, internal path = English slug); never build public URLs from `location.pathname`.
- Public per-env values: `site.config.ts` (build-time, by CLOUDFLARE_ENV). Secrets: Secrets Store bindings via `import { env } from 'cloudflare:workers'`, read per request.

## Gotchas
- Bump a page's `lastmod` when its main content, JSON-LD or links change.
- JSON-LD and inline scripts go in route `scripts()`, never `head()` (React #418). Theme-color pair lives in RootDocument.
- No Date.now()/new Date() in render. Tailwind 4: `outline-hidden`, not `outline-none`.
- workers-types shadows Element.append — use appendChild.
- Playwright: wait for `body[data-hydrated="true"]` before clicking.
- `pnpm e2e` serves whatever is in `dist/` and reuses any server already on :4173: after a `CLOUDFLARE_ENV=production pnpm build`, run `pnpm build` again and stop stale previews first (the real Turnstile key fails locally).
- After any version bump run `pnpm dedupe`. wrangler can exit 0 without deploying — the deploy action greps for confirmation.

## Checks (local is allowed here; CI is the source of truth)
`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm knip && pnpm run doctor`
Narrow tests: `VITEST_MAX_WORKERS=2 pnpm exec vitest run <files>`.

## Deploy / rollback
Prod: `gh workflow run deploy-prod.yml --ref main` (needs a green push CI run for that SHA). Smoke: `bash scripts/smoke.sh`.
Rollback: `pnpm exec wrangler rollback --name prod-zenet-web`.
Pre-promotion check: `CLOUDFLARE_ENV=production pnpm build && pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias <name>`.
