import type { ParsedEmail } from "./email.ts";

// Discord embed limits (https://discord.com/developers/docs/resources/message#embed-object-embed-limits).
const EMBED_TITLE_LIMIT = 256;
const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBED_FIELD_VALUE_LIMIT = 1024;

const TRUNCATION_MARKER = "\n\n…(truncated)";

/** Truncate `value` to `limit` characters, appending an ellipsis when cut. */
function truncate(value: string, limit: number, marker = "…"): string {
  if (value.length <= limit) return value;
  return value.slice(0, Math.max(0, limit - marker.length)) + marker;
}

/** Build a Discord webhook payload (single embed) from a parsed email. */
export function buildDiscordPayload(email: ParsedEmail): unknown {
  const body = email.text
    ? truncate(email.text, EMBED_DESCRIPTION_LIMIT, TRUNCATION_MARKER)
    : "(empty body)";

  return {
    embeds: [
      {
        title: truncate(email.subject, EMBED_TITLE_LIMIT),
        description: body,
        fields: [
          {
            name: "From",
            value: truncate(email.from, EMBED_FIELD_VALUE_LIMIT),
          },
        ],
      },
    ],
  };
}

/**
 * Post a parsed email to a Discord webhook. Throws on a non-2xx response so the
 * caller can log and continue without aborting mail forwarding.
 */
export async function notifyDiscord(
  webhookUrl: string,
  email: ParsedEmail,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildDiscordPayload(email)),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Discord webhook responded ${response.status} ${response.statusText}: ${detail}`,
    );
  }
}
