import { REST, type ResponseLike } from "@discordjs/rest";
import type { APIEmbed } from "discord-api-types/v10";

import type { ParsedEmail } from "./email.ts";
import type { WebhookEndpoint } from "./env.ts";

// Discord embed limits (https://discord.com/developers/docs/resources/message#embed-object-embed-limits).
const EMBED_TITLE_LIMIT = 256;
const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBED_FIELD_VALUE_LIMIT = 1024;

// The REST constructor schedules interval timers (rate-limit bucket sweepers),
// which are disallowed at global scope on Cloudflare Workers (error 10021).
// Construct it lazily inside a handler, and disable the sweepers since webhook
// posts don't need them.
let rest: REST | undefined;
const getRest = (): REST => {
  rest ??= new REST({
    makeRequest: (url, init) => fetch(url, init as RequestInit) as Promise<ResponseLike>,
    hashSweepInterval: 0,
    handlerSweepInterval: 0,
  });

  return rest;
};

export const notifyDiscord = (webhook: WebhookEndpoint, email: ParsedEmail): Promise<void> =>
  getRest()
    .post(`/webhooks/${webhook.id}/${webhook.token}`, {
      body: { embeds: [buildEmbed(email)] },
      auth: false,
      versioned: false,
    })
    .then(() => undefined);

const buildEmbed = (email: ParsedEmail): APIEmbed => {
  const description = email.body
    ? truncate(email.body, EMBED_DESCRIPTION_LIMIT, "\n\n… (以下省略)")
    : "(empty body)";

  return {
    title: truncate(email.subject, EMBED_TITLE_LIMIT, "…"),
    description,
    fields: [
      { name: "From", value: truncate(email.from, EMBED_FIELD_VALUE_LIMIT, "…") },
      { name: "To", value: truncate(email.to, EMBED_FIELD_VALUE_LIMIT, "…") },
    ],
  };
};

const truncate = (value: string, limit: number, marker: string): string => {
  if (value.length <= limit) return value;
  return value.slice(0, limit - marker.length) + marker;
};
