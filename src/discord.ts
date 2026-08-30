import { REST, type ResponseLike } from "@discordjs/rest";
import type { APIEmbed } from "discord-api-types/v10";

import type { ParsedEmail } from "./email.ts";
import type { WebhookEndpoint } from "./env.ts";

export const notifyDiscord = (webhook: WebhookEndpoint, email: ParsedEmail): Promise<void> =>
  getRest()
    .post(`/webhooks/${webhook.id}/${webhook.token}`, {
      body: { embeds: [buildEmbed(email)] },
      auth: false,
      versioned: false,
    })
    .then(() => undefined);

// The REST constructor schedules interval timers which are disallowed at global scope
//  on Cloudflare Workers (error 10021).
// Thus, construct it lazily inside a handler.
let rest: REST | undefined = undefined;
const getRest = (): REST => {
  rest ??= new REST({
    makeRequest: (url, init) => fetch(url, init as RequestInit) as Promise<ResponseLike>,
    hashSweepInterval: 0,
    handlerSweepInterval: 0,
  });

  return rest;
};

// Discord embed limits
// ref: https://discord.com/developers/docs/resources/message#embed-object-embed-limits
const EMBED_TITLE_LIMIT = 256;
const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBED_FIELD_VALUE_LIMIT = 1024;

export const TRUNC_MARKER_SHORT = "…";
export const TRUNC_MARKER_LONG = "\n\n… (以下省略)";

const buildEmbed = (email: ParsedEmail): APIEmbed => {
  const description = email.body
    ? truncate(email.body, EMBED_DESCRIPTION_LIMIT, TRUNC_MARKER_LONG)
    : "(empty body)";

  return {
    title: truncate(email.subject, EMBED_TITLE_LIMIT, TRUNC_MARKER_SHORT),
    description,
    fields: [
      {
        name: "From",
        value: truncate(email.from, EMBED_FIELD_VALUE_LIMIT, TRUNC_MARKER_SHORT),
      },
      {
        name: "To",
        value: truncate(email.to, EMBED_FIELD_VALUE_LIMIT, TRUNC_MARKER_SHORT),
      },
    ],
  };
};

const truncate = (value: string, limit: number, marker: string): string => {
  if (value.length <= limit) return value;
  return value.slice(0, limit - marker.length) + marker;
};
