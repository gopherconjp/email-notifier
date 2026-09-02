export interface WebhookEndpoint {
  id: string;
  token: string;
}

let cachedRaw: string | undefined;
let cachedMap: Record<string, WebhookEndpoint>;

export const getWebhookMap = (rawJson: string): Record<string, WebhookEndpoint> => {
  if (rawJson !== cachedRaw) {
    cachedRaw = rawJson;
    cachedMap = parseWebhookMap(rawJson);
  }

  return cachedMap;
};

const parseWebhookMap = (rawJson: string): Record<string, WebhookEndpoint> => {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!isStringRecord(parsed)) {
      console.error("DISCORD_WEBHOOK_MAP is not a JSON object of strings; ignoring.");
      return {};
    }

    const map: Record<string, WebhookEndpoint> = {};
    for (const [user, url] of Object.entries(parsed)) {
      map[user] = parseWebhookUrl(url);
    }

    return map;
  } catch (error) {
    console.error("Failed to parse DISCORD_WEBHOOK_MAP:", error);
  }

  return {};
};

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === "string");
};

const parseWebhookUrl = (url: string): WebhookEndpoint => {
  const parts = new URL(url).pathname.split("/").filter((part) => part !== "");
  if (parts[0] !== "api" || parts[1] !== "webhooks" || parts.length < 4) {
    throw new Error("Not a Discord webhook URL");
  }

  return { id: parts[2], token: parts[3] };
};
