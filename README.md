# email-notifier

Cloudflare Email Worker that, for each incoming email, **forwards** it to another
mail server **and** posts a Discord notification chosen by the recipient's
username.

Mail to `{username}@your-domain` (e.g. `user1@gophercon.jp`) is forwarded to
`{username}@FORWARD_EMAIL_DOMAIN` and posted as a Discord embed to the webhook
mapped to `{username}`. Usernames with no mapping are forwarded only (no error).

Domain-agnostic; single runtime dependency
([`postal-mime`](https://github.com/postalsys/postal-mime)).

## How it works

`email()` ([`src/index.ts`](src/index.ts)) starts `message.forward()` without
awaiting (concurrent with the notification), looks up the webhook for the
username — parsing `DISCORD_WEBHOOK_MAP` once per instance — posts the email as a
Discord embed with the body trimmed to Discord's limits, then awaits the forward.
Notification errors are logged and swallowed so forwarding is never affected.

## Configuration

Two values, read as **Workers secrets** in production and **dev vars** locally:

| Name                   | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `DISCORD_WEBHOOK_MAP`  | JSON object mapping username → Discord webhook URL. |
| `FORWARD_EMAIL_DOMAIN` | Domain incoming mail is forwarded to.               |

Both live in a git-ignored `.env.yaml` (see
[`.env.yaml.example`](.env.yaml.example)):

```bash
cp .env.yaml.example .env.yaml   # then edit
bun run gen:dev-vars             # -> .dev.vars for local dev
```

For production the same `.env.yaml` is stored as one GitHub secret and pushed to
the Worker by the deploy workflow (see [Deployment](#deployment)); no manual
`wrangler secret put` is needed.

## Development

Toolchain (bun, node) is pinned in [`mise.toml`](mise.toml); installs enforce a
3-day release cooldown ([`bunfig.toml`](bunfig.toml)) for supply-chain safety.

```bash
mise install        # pinned bun/node (optional)
bun install
bun run gen         # gen:cf-types + gen:dev-vars
bun run dev         # vite dev, loads .dev.vars
bun run typecheck   # tsc --noEmit
bun run test        # vitest (Workers runtime)
bun run build       # vite build
```

Deploys happen in CI on merge to `main` (see [Deployment](#deployment)); there is
no local `deploy` script.

## Deployment

Merging to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
`typecheck` + `test`, then it writes `.env.yaml` from the `ENV_YAML` secret, runs
`gen:dev-vars` (the same script used locally) to produce `.dev.vars`, uploads it
with `wrangler secret bulk`, and deploys with
[`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action).
All GitHub Actions are pinned to commit SHAs; `wranglerVersion` is pinned to the
lockfile's wrangler.

Set these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret                 | Value                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare token with Workers edit permission.                   |
| `ENV_YAML`             | The full contents of your `.env.yaml` (same file used locally).  |

There is no separate production format: production and local dev share one
`.env.yaml`. Changing a webhook or the forward domain means editing `ENV_YAML`
and re-running the deploy — no hand-written JSON, no `wrangler secret put`.

One-time setup outside CI: create the API token, and route incoming mail to this
Worker in the Cloudflare dashboard (Email → Email Routing → Email Workers).
