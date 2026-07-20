import { readFileSync } from "node:fs";
import { parse } from "yaml";

/** Path to the (git-ignored) YAML configuration source. */
export const CONFIG_PATH = ".env.yaml";

/** Shape of `.env.yaml`. */
interface ConfigFile {
  DISCORD_WEBHOOK_MAP: Record<string, string>;
  FORWARD_EMAIL_DOMAIN: string;
}

/** The two secret values in the exact form the Worker consumes them. */
export interface WorkerSecrets {
  /** JSON-encoded username -> webhook URL map. */
  DISCORD_WEBHOOK_MAP: string;
  FORWARD_EMAIL_DOMAIN: string;
}

/**
 * Read and validate `.env.yaml`, returning the two Worker secret values.
 * `DISCORD_WEBHOOK_MAP` is JSON-stringified so it can be stored as a single
 * secret / dev var.
 */
export function loadConfig(path: string = CONFIG_PATH): WorkerSecrets {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Config file not found: ${path}\n` +
        `Copy .env.yaml.example to ${path} and fill in real values.`,
    );
  }

  const data = parse(raw) as Partial<ConfigFile> | null;
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid configuration in ${path}: expected a YAML mapping.`);
  }

  const map = data.DISCORD_WEBHOOK_MAP;
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new Error(
      `DISCORD_WEBHOOK_MAP missing or not a mapping in ${path}.`,
    );
  }
  for (const [user, url] of Object.entries(map)) {
    if (typeof url !== "string") {
      throw new Error(
        `DISCORD_WEBHOOK_MAP["${user}"] must be a string URL in ${path}.`,
      );
    }
  }

  const domain = data.FORWARD_EMAIL_DOMAIN;
  if (!domain || typeof domain !== "string") {
    throw new Error(
      `FORWARD_EMAIL_DOMAIN missing or not a string in ${path}.`,
    );
  }

  return {
    DISCORD_WEBHOOK_MAP: JSON.stringify(map),
    FORWARD_EMAIL_DOMAIN: domain,
  };
}
