# email-notifier

Cloudflare Email Worker that, for each incoming email, **forwards** it to another
mail server **and** posts a notification to a Discord webhook chosen by the
recipient's username.

Mail addressed to `{username}@your-domain` (e.g. `user1@gophercon.jp`) is:

1. **Forwarded** to `{username}@FORWARD_EMAIL_DOMAIN`.
2. **Notified** to the Discord webhook mapped to `{username}` — if one is
   configured. Usernames without a mapping are forwarded only (no notification,
   no error).

The Worker is domain-agnostic and has a single runtime dependency
([`postal-mime`](https://github.com/postalsys/postal-mime) for MIME parsing).

## How it works

The `email()` handler ([`src/index.ts`](src/index.ts)):

1. Extracts the username (local part) from the recipient address.
2. Starts forwarding via `message.forward()` **without awaiting** — it runs
   concurrently with the notification.
3. Parses `DISCORD_WEBHOOK_MAP` **once per Worker instance** (lazily, cached).
4. Looks up the webhook URL for the username; if none, skips notification.
5. Parses the email (subject / sender / body, HTML converted to text) and posts
   a formatted Discord **embed**, trimming the body to Discord's limits. Any
   error here is logged and swallowed so forwarding is never affected.
6. Awaits the forward Promise before finishing.

## Configuration

The Worker reads two values, provided as **Workers secrets** in production and
as **dev vars** locally:

| Name                   | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `DISCORD_WEBHOOK_MAP`  | JSON object mapping username → Discord webhook URL. |
| `FORWARD_EMAIL_DOMAIN` | Domain that incoming mail is forwarded to.         |

Both are edited in one place — a git-ignored **`.env.yaml`** — and applied via
the scripts below. Copy the template to start:

```bash
cp .env.yaml.example .env.yaml
# edit .env.yaml
```

```yaml
# .env.yaml
DISCORD_WEBHOOK_MAP:
  user1: "https://discord.com/api/webhooks/xxxx/yyyy"
  user2: "https://discord.com/api/webhooks/aaaa/bbbb"
FORWARD_EMAIL_DOMAIN: "forward.example.com"
```

### Scripts

```bash
bun install

# Generate `.dev.vars` from `.env.yaml` for local development.
bun run gen:dev-vars

# Upload the values as production Workers secrets (via `wrangler secret bulk`).
bun run set:secrets
```

`set:secrets` overwrites the two managed secrets. It is **additive**: any other
production-only secret you set separately with `wrangler secret put` is
preserved. Because `DISCORD_WEBHOOK_MAP` is a single secret holding the whole
JSON map, re-running fully replaces the map (removed users disappear).

> `.env.yaml`, `.dev.vars`, and other secret files are git-ignored. Only
> `.env.yaml.example` is committed.

## Development

The toolchain (bun, node) is pinned in [`mise.toml`](mise.toml). With
[mise](https://mise.jdx.dev) installed:

```bash
mise install   # install the pinned bun/node
bun install    # install dependencies
```

Dependency installs enforce a 3-day release cooldown (`minimumReleaseAge` in
[`bunfig.toml`](bunfig.toml)) to reduce supply-chain risk from freshly published
versions.

```bash
bun run gen         # generate everything: gen:cf-types + gen:dev-vars
bun run gen:cf-types # wrangler types -> worker-configuration.d.ts
bun run dev         # vite dev (@cloudflare/vite-plugin), loads .dev.vars
bun run typecheck   # tsc --noEmit
bun run test        # vitest (runs in the Workers runtime via workers pool)
bun run build       # vite build
bun run deploy      # wrangler deploy
```

After deploying, route your domain's incoming mail to this Worker in the
Cloudflare dashboard (Email → Email Routing → Email Workers), then set the
production secrets with `bun run set:secrets`.
