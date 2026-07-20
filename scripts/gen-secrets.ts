import { writeFileSync } from "node:fs";
import { loadConfig } from "./load-config.ts";

/** Path to the generated `wrangler secret bulk` input (git-ignored). */
const SECRETS_PATH = ".secrets.json";

/**
 * Emit the Worker secrets as a `wrangler secret bulk` JSON file. `loadConfig`
 * already returns the values in the exact form the Worker consumes (the webhook
 * map JSON-stringified), which is also the flat key -> value object that
 * `wrangler secret bulk` expects. Used by the deploy workflow so production and
 * local dev share one `.env.yaml` source.
 */
function main(): void {
  const secrets = loadConfig();

  writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(`Wrote ${SECRETS_PATH} from .env.yaml.`);
}

main();
