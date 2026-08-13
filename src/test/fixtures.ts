import { vi } from "vitest";
import type { Env } from "../index.ts";

export const WEBHOOK = "https://discord.com/api/webhooks/xxxx/yyyy";
export const WEBHOOK_ENDPOINT = { id: "xxxx", token: "yyyy" };

export const buildMime = (headers: Record<string, string>, body: string): string => {
  const head = Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\r\n");
  return `${head}\r\n\r\n${body}\r\n`;
};

export const mimeStream = (mime: string): ReadableStream<Uint8Array> => new Response(mime).body!;

export const makeMessage = (to: string) => {
  const mime = buildMime({ From: "Alice <alice@example.com>", To: to, Subject: "Hello" }, "Body.");
  const forward = vi.fn<ForwardableEmailMessage["forward"]>();
  const message: ForwardableEmailMessage = {
    from: "alice@example.com",
    to,
    headers: new Headers(),
    raw: mimeStream(mime),
    rawSize: mime.length,
    forward,
    setReject: vi.fn(),
    reply: vi.fn(),
  };
  return { message, forward };
};

export const makeEnv = (map: Record<string, string> = { user1: WEBHOOK }): Env => ({
  DISCORD_WEBHOOK_MAP: JSON.stringify(map),
  FORWARD_EMAIL_DOMAIN: "forward.example.com",
});

export const spyFetchOk = () =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

export const spyFetchError = (status: number, body = "") =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status }));
