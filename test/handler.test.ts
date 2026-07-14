import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { parseWebhookMap } from "../src/index.ts";
import type { Env } from "../src/index.ts";
import { buildMime, mimeStream } from "./fixtures.ts";

const WEBHOOK = "https://discord.com/api/webhooks/xxxx/yyyy";

const SAMPLE_MIME = buildMime(
  { From: "Alice <alice@example.com>", To: "user1@gophercon.jp", Subject: "Hello" },
  "Body.",
);

function makeMessage(to: string) {
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
  } as unknown as ForwardableEmailMessage;
  return { message, forward };
}

function makeEnv(map: Record<string, string> = { user1: WEBHOOK }): Env {
  return {
    DISCORD_WEBHOOK_MAP: JSON.stringify(map),
    FORWARD_EMAIL_DOMAIN: "forward.example.com",
  };
}


describe("parseWebhookMap", () => {
  it("parses a JSON object", () => {
    expect(parseWebhookMap('{"a":"u"}')).toEqual({ a: "u" });
  });

  it("returns an empty map for invalid JSON without throwing", () => {
    expect(parseWebhookMap("not json")).toEqual({});
  });

  it("returns an empty map for non-object JSON", () => {
    expect(parseWebhookMap("[1,2]")).toEqual({});
  });
});

describe("email handler", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards to {username}@FORWARD_EMAIL_DOMAIN", async () => {
    const { message, forward } = makeMessage("user1@gophercon.jp");
    await worker.email!(message, makeEnv());
    expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
  });

  it("notifies Discord for a registered username", async () => {
    const { message } = makeMessage("user1@gophercon.jp");
    await worker.email!(message, makeEnv());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toBe(WEBHOOK);
  });

  it("forwards only (no Discord) for an unregistered username", async () => {
    const { message, forward } = makeMessage("nobody@gophercon.jp");
    await worker.email!(message, makeEnv());
    expect(forward).toHaveBeenCalledWith("nobody@forward.example.com");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still forwards when the Discord webhook fails", async () => {
    fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { message, forward } = makeMessage("user1@gophercon.jp");

    await expect(
      worker.email!(message, makeEnv()),
    ).resolves.toBeUndefined();

    expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("forwards without error when the webhook map is invalid JSON", async () => {
    const env: Env = { ...makeEnv(), DISCORD_WEBHOOK_MAP: "not json" };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { message, forward } = makeMessage("user1@gophercon.jp");

    await worker.email!(message, env);

    expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
