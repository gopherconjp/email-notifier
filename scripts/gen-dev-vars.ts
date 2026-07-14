import { writeFileSync } from "node:fs";
import { loadConfig } from "./load-config.ts";

/** Path to the wrangler local-development secrets file. */
const DEV_VARS_PATH = ".dev.vars";

/**
 * Serialize a value as a single-quoted dotenv entry. The webhook map is JSON
 * (contains only double quotes), so single-quoting keeps it intact on one line
 * without any escaping.
 */
function dotenvLine(key: string, value: string): string {
  return `${key}='${value}'`;
}

function main(): void {
  const secrets = loadConfig();

  const contents =
    [
      "# Generated from .env.yaml by `bun run gen:dev-vars`. Do not edit by hand.",
      "# Used by `vite dev` / `wrangler dev` for local development.",
      dotenvLine("DISCORD_WEBHOOK_MAP", secrets.DISCORD_WEBHOOK_MAP),
      dotenvLine("FORWARD_EMAIL_DOMAIN", secrets.FORWARD_EMAIL_DOMAIN),
    ].join("\n") + "\n";

  writeFileSync(DEV_VARS_PATH, contents, { mode: 0o600 });
  console.log(`Wrote ${DEV_VARS_PATH} from .env.yaml.`);
}

main();
