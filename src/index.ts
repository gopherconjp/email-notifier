import { notifyDiscord } from "./discord.ts";
import { extractUsername, parseEmail } from "./email.ts";

export interface Env {
  DISCORD_WEBHOOK_MAP: string;
  FORWARD_EMAIL_DOMAIN: string;
}

export default {
  async email(message, env): Promise<void> {
    const username = extractUsername(message.to);

    // Forward concurrently with the notification; awaited at the end.
    const forwardPromise = message.forward(
      `${username}@${env.FORWARD_EMAIL_DOMAIN}`,
    );

    try {
      const webhookUrl = getWebhookMap(env.DISCORD_WEBHOOK_MAP)[username];
      if (webhookUrl) {
        const parsed = await parseEmail(message.raw);
        await notifyDiscord(webhookUrl, parsed);
      }
    } catch (error) {
      console.error("Discord notification failed:", error);
    }

    await forwardPromise;
  },
} satisfies ExportedHandler<Env>;

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
