import { notifyDiscord } from "./discord.ts";
import { extractUsername, parseEmail } from "./email.ts";

export interface Env {
  /** JSON object mapping username -> Discord webhook URL. */
  DISCORD_WEBHOOK_MAP: string;
  /** Domain that incoming mail is forwarded to. */
  FORWARD_EMAIL_DOMAIN: string;
}

/**
 * Parse the `DISCORD_WEBHOOK_MAP` secret into a lookup object. Invalid input is
 * logged and treated as an empty map so mail forwarding is never blocked.
 */
export function parseWebhookMap(rawJson: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    console.error("DISCORD_WEBHOOK_MAP is not a JSON object; ignoring.");
  } catch (error) {
    console.error("Failed to parse DISCORD_WEBHOOK_MAP:", error);
  }
  return {};
}

// Cache the parsed map keyed on the raw secret. In production the secret is
// constant, so this parses exactly once per Worker instance; when the value
// changes (e.g. between tests) it is re-parsed.
let cachedRaw: string | undefined;
let cachedMap: Record<string, string> = {};

function getWebhookMap(rawJson: string): Record<string, string> {
  if (rawJson !== cachedRaw) {
    cachedRaw = rawJson;
    cachedMap = parseWebhookMap(rawJson);
  }
  return cachedMap;
}

export default {
  async email(message, env): Promise<void> {
    const username = extractUsername(message.to);

    // Start forwarding immediately and keep the Promise; do not await yet so the
    // Discord notification runs concurrently with delivery.
    const forwardPromise = message.forward(
      `${username}@${env.FORWARD_EMAIL_DOMAIN}`,
    );

    try {
      const webhookUrl = getWebhookMap(env.DISCORD_WEBHOOK_MAP)[username];
      // No webhook for this username: forward only, no notification, no error.
      if (webhookUrl) {
        const parsed = await parseEmail(message.raw);
        await notifyDiscord(webhookUrl, parsed);
      }
    } catch (error) {
      // Never let a notification failure abort mail forwarding.
      console.error("Discord notification failed:", error);
    }

    // Wait for forwarding to settle before finishing the handler.
    await forwardPromise;
  },
} satisfies ExportedHandler<Env>;
