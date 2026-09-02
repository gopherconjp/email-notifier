import { readFileSync } from "node:fs";

import { parse } from "yaml";

const CONFIG_PATH = ".env.yaml";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface WorkerSecrets {
  DISCORD_WEBHOOK_MAP: string;
  FORWARD_EMAIL_DOMAIN: string;
}

export const loadConfig = (path: string = CONFIG_PATH): WorkerSecrets => {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Config file not found: ${path}\n` +
        `Copy .env.yaml.example to ${path} and fill in real values.`,
    );
  }

  const parsed: unknown = parse(raw);
  if (!isRecord(parsed)) {
    throw new Error(`Invalid configuration in ${path}: expected a YAML mapping.`);
  }

  const mapValue = parsed["DISCORD_WEBHOOK_MAP"];
  if (!isRecord(mapValue)) {
    throw new Error(`DISCORD_WEBHOOK_MAP missing or not a mapping in ${path}.`);
  }
  for (const [user, url] of Object.entries(mapValue)) {
    if (typeof url !== "string") {
      throw new Error(`DISCORD_WEBHOOK_MAP["${user}"] must be a string URL in ${path}.`);
    }
  }

  const domain = parsed["FORWARD_EMAIL_DOMAIN"];
  if (typeof domain !== "string") {
    throw new Error(`FORWARD_EMAIL_DOMAIN missing or not a string in ${path}.`);
  }

  return {
    DISCORD_WEBHOOK_MAP: JSON.stringify(mapValue),
    FORWARD_EMAIL_DOMAIN: domain,
  };
};
