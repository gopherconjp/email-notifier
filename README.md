# email-notifier

Cloudflare Email Worker that, for each incoming email, **forwards** it to another
mail server **and** posts a Discord notification chosen by the recipient's
username.

Mail to `{username}@your-domain` (e.g. `user1@gophercon.jp`) is forwarded to
`{username}@FORWARD_EMAIL_DOMAIN` and posted as a Discord embed to the webhook
mapped to `{username}`. Usernames with no mapping are forwarded only (no error).

Domain-agnostic; runtime dependencies kept to
[`postal-mime`](https://github.com/postalsys/postal-mime) (MIME parsing) and
[`html-to-text`](https://github.com/html-to-text/node-html-to-text) (HTML body →
plain text).

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

`.env.yaml` is for local development only. In production the same two values are
held as Workers secrets inside Cloudflare and are never mirrored to GitHub (see
[Deployment](#deployment)).

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

Cloudflare deploys on merge to `main` (see [Deployment](#deployment)); there is
no local `deploy` script.

## Deployment

Deployment is **pull-type**:
[Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
watches this repository and builds it itself. Nothing deploys from GitHub
Actions, and the repository holds no Cloudflare credentials — a code change is
the only way GitHub can affect the Worker.

- Push to `main` — Cloudflare builds and deploys to production.
- Pull request — Cloudflare runs the same build, so a PR is checked in the
  environment it will actually ship in.

Secrets (`DISCORD_WEBHOOK_MAP`, `FORWARD_EMAIL_DOMAIN`) are set on the Worker in
the Cloudflare dashboard and stay there; changing a webhook or the forward domain
is a dashboard edit, not a commit or a redeploy of new code.

One-time setup, all in the Cloudflare dashboard: connect this repository to the
Worker, set the two secrets, and route incoming mail to the Worker via Email
Routing.
