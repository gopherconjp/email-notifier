import { vi } from "vitest";
import type { Env } from "../index.ts";

export const WEBHOOK = "https://discord.com/api/webhooks/xxxx/yyyy";

export function buildMime(headers: Record<string, string>, body: string): string {
  const head = Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\r\n");
  return `${head}\r\n\r\n${body}\r\n`;
}

export function mimeStream(mime: string): ReadableStream<Uint8Array> {
  return new Response(mime).body!;
}

const SAMPLE_MIME = buildMime(
  { From: "Alice <alice@example.com>", To: "user1@gophercon.jp", Subject: "Hello" },
  "Body.",
);

export function makeMessage(to: string) {
  const forward = vi.fn<(rcptTo: string) => Promise<void>>().mockResolvedValue();
  const message = {
    from: "alice@example.com",
    to,
    headers: new Headers(),
    raw: mimeStream(SAMPLE_MIME),
    rawSize: SAMPLE_MIME.length,
    forward,
    setReject: vi.fn(),
    reply: vi.fn(),
    // Partial mock: cast through `unknown` to the full message type.
    // oxlint-disable-next-line typescript/no-restricted-types
  } as unknown as ForwardableEmailMessage;
  return { message, forward };
}

export function makeEnv(map: Record<string, string> = { user1: WEBHOOK }): Env {
  return {
    DISCORD_WEBHOOK_MAP: JSON.stringify(map),
    FORWARD_EMAIL_DOMAIN: "forward.example.com",
  };
}
