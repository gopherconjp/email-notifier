export interface WebhookEndpoint {
  id: string;
  token: string;
}

const parseWebhookUrl = (url: string): WebhookEndpoint => {
  const parts = new URL(url).pathname.split("/").filter((part) => part !== "");
  if (parts[0] !== "api" || parts[1] !== "webhooks" || parts.length < 4) {
    throw new Error("Not a Discord webhook URL");
  }

  return { id: parts[2], token: parts[3] };
};

const parseWebhookMap = (rawJson: string): Record<string, WebhookEndpoint> => {
  try {
    const parsed: unknown = JSON.parse(rawJson); // oxlint-disable-line typescript/no-restricted-types
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.error("DISCORD_WEBHOOK_MAP is not a JSON object; ignoring.");
      return {};
    }

    const map: Record<string, WebhookEndpoint> = {};
    for (const [user, url] of Object.entries(parsed as Record<string, string>)) {
      map[user] = parseWebhookUrl(url);
    }

    return map;
  } catch (error) {
    console.error("Failed to parse DISCORD_WEBHOOK_MAP:", error);
  }

  return {};
};

let cachedRaw: string | undefined;
let cachedMap: Record<string, WebhookEndpoint> = {};

export const getWebhookMap = (rawJson: string): Record<string, WebhookEndpoint> => {
  if (rawJson !== cachedRaw) {
    cachedRaw = rawJson;
    cachedMap = parseWebhookMap(rawJson);
  }

  return cachedMap;
};
