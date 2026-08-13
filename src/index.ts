import { notifyDiscord } from "./discord.ts";
import { extractUsername, parseEmail, stripTag } from "./email.ts";
import { getWebhookMap } from "./env.ts";

export interface Env {
  DISCORD_WEBHOOK_MAP: string;
  FORWARD_EMAIL_DOMAIN: string;
}

export default {
  email: async (message, env): Promise<void> => {
    const username = extractUsername(message.to);

    const forwardPromise = message.forward(`${username}@${env.FORWARD_EMAIL_DOMAIN}`);

    try {
      const webhook = getWebhookMap(env.DISCORD_WEBHOOK_MAP)[stripTag(username)];
      if (webhook) {
        const parsed = await parseEmail(message.raw);
        await notifyDiscord(webhook, parsed);
      }
    } catch (error) {
      console.error("Discord notification failed:", error);
    }

    await forwardPromise;
  },
} satisfies ExportedHandler<Env>;
