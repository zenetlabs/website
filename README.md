# zenetlabs.com

Website of Zenet Labs (Zenet Technology Pte. Ltd.), an AI and agentic-company consultancy. TanStack Start, server-rendered on a Cloudflare Worker (`prod-zenet-web`). English at `/`, Spanish at `/es`.

## Setup

```sh
pnpm i
```

Node 24 and the pnpm version pinned in `package.json` are required.

### Local secrets (one time)

The Worker binds five Secrets Store secrets (Turnstile, Resend, the Google calendar bundle, the ElevenLabs tool secret and the ElevenLabs API key). Locally they resolve to dummy values; this creates no remote data. The commands, with the store id from `wrangler.jsonc`, are in [`.github/actions/local-secrets/action.yml`](.github/actions/local-secrets/action.yml) (the same ones CI runs); [docs/RUNBOOK.md](docs/RUNBOOK.md) section 6 explains each secret.

## Develop

```sh
pnpm dev                              # http://localhost:3000
pnpm build && pnpm preview            # http://localhost:4173
pnpm e2e                              # Playwright + axe against pnpm preview
PLAYWRIGHT_BASE_URL=https://... pnpm e2e   # against a deployed site
PLAYWRIGHT_BASE_URL=https://... pnpm exec playwright test e2e/sitemap.e2e.ts   # sitemap walk, no browser needed
node scripts/og-images.mjs            # regenerate public/og-en.png and public/og-es.png
```

Other checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm knip`, `pnpm run doctor`, `pnpm lhci` (Lighthouse, mobile then desktop).

## Deploy

Production deploys run from `main` through GitHub Actions and need a green push CI run for that commit:

```sh
gh workflow run deploy-prod.yml --ref main
```

The job builds with `CLOUDFLARE_ENV=production`, deploys `dist/server/wrangler.json`, runs `bash scripts/smoke.sh`, then walks the sitemap with `e2e/sitemap.e2e.ts` against production.

To check a build on a Version URL without promoting it:

```sh
CLOUDFLARE_ENV=production pnpm build && pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias <name>
```

## Roll back

```sh
pnpm exec wrangler rollback --name prod-zenet-web
```

## Operations

- [docs/RUNBOOK.md](docs/RUNBOOK.md): deploy, rollback, secrets, SQL, feature flips, kill switches, incidents, retention.
- [docs/owner-checklist.md](docs/owner-checklist.md): what only the owner can do, with every `TODO(albert)`.
- [docs/analytics.md](docs/analytics.md) and [docs/ai-assistant.md](docs/ai-assistant.md): feature design and verification.
