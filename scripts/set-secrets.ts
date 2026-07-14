import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./load-config.ts";

/**
 * Upload the two managed values from `.env.yaml` as production Workers secrets
 * via `wrangler secret bulk`.
 *
 * `wrangler secret bulk` is additive: it overwrites the keys it is given and
 * leaves any other production-only secrets (set separately with
 * `wrangler secret put`) untouched. Because DISCORD_WEBHOOK_MAP is a single
 * secret holding the whole JSON map, re-running this fully replaces the map
 * (removed users disappear).
 *
 * The values are written to a short-lived temp JSON file (bulk's unambiguous
 * input format) and deleted immediately afterwards.
 */
function main(): void {
  const secrets = loadConfig();

  const dir = mkdtempSync(join(tmpdir(), "email-notifier-secrets-"));
  const file = join(dir, "secrets.json");

  try {
    writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
    console.log("Uploading DISCORD_WEBHOOK_MAP and FORWARD_EMAIL_DOMAIN...");
    // Run the project-local wrangler through bun so it resolves without a
    // global install.
    execFileSync("bun", ["x", "wrangler", "secret", "bulk", file], {
      stdio: "inherit",
    });
    console.log("Done. Production secrets updated.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
