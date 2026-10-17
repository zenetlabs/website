# zenetlabs.com

Website of Zenet Labs (Zenet Technology Pte. Ltd.), an AI and agentic-company consultancy. TanStack Start, server-rendered on a Cloudflare Worker (`prod-zenet-web`). English at `/`, Spanish at `/es`.

## Setup

```sh
pnpm i
```

Node 24 and the pnpm version pinned in `package.json` are required.

### Local secrets (one time)

The Worker binds two Secrets Store secrets. Locally they resolve to dummy values; this creates no remote data.

```sh
pnpm exec wrangler secrets-store secret create 5a96b366abb34e3991c881dab187adfd --name ZENETLABS_PROD_TURNSTILE_SECRET --value 1x0000000000000000000000000000000AA --scopes workers
pnpm exec wrangler secrets-store secret create 5a96b366abb34e3991c881dab187adfd --name PROD_RESEND_API_KEY --value re_local_dummy --scopes workers
```

## Develop

```sh
pnpm dev                              # http://localhost:3000
pnpm build && pnpm preview            # http://localhost:4173
pnpm e2e                              # Playwright + axe against pnpm preview
PLAYWRIGHT_BASE_URL=https://... pnpm e2e   # against a deployed site
```

Other checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm knip`, `pnpm run doctor`, `pnpm lhci`.

## Deploy

Production deploys run from `main` through GitHub Actions and need a green push CI run for that commit:

```sh
gh workflow run deploy-prod.yml --ref main
```

The job builds with `CLOUDFLARE_ENV=production`, deploys `dist/server/wrangler.json` and runs `bash scripts/smoke.sh`.

To check a build on a Version URL without promoting it:

```sh
CLOUDFLARE_ENV=production pnpm build && pnpm exec wrangler versions upload --config dist/server/wrangler.json --preview-alias <name>
```

## Roll back

```sh
pnpm exec wrangler rollback --name prod-zenet-web
```
