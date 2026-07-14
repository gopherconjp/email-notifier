import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { parseWebhookMap } from "./index.ts";
import type { Env } from "./index.ts";
import { buildMime, mimeStream } from "./test-fixtures.ts";

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
  it.each([
    { raw: '{"user1":"url"}', map: { user1: "url" } },
    { raw: "not json", map: {} },
    { raw: "[1,2]", map: {} },
  ])("parses $raw into a username map", ({ raw, map }) => {
    expect(parseWebhookMap(raw)).toEqual(map);
  });
});

describe("email handler", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards every message to {username}@FORWARD_EMAIL_DOMAIN", async () => {
    const { message, forward } = makeMessage("user1@gophercon.jp");

    await worker.email!(message, makeEnv());

    expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
  });

  it("notifies the Discord webhook mapped to the username", async () => {
    const { message } = makeMessage("user1@gophercon.jp");

    await worker.email!(message, makeEnv());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toBe(WEBHOOK);
  });

  it("forwards without notifying when the username has no webhook", async () => {
    const { message, forward } = makeMessage("nobody@gophercon.jp");

    await worker.email!(message, makeEnv());

    expect(forward).toHaveBeenCalledWith("nobody@forward.example.com");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still forwards when the Discord webhook responds with an error", async () => {
    fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { message, forward } = makeMessage("user1@gophercon.jp");

    await expect(worker.email!(message, makeEnv())).resolves.toBeUndefined();

    expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
  });

  it("forwards without notifying when DISCORD_WEBHOOK_MAP is invalid JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { message, forward } = makeMessage("user1@gophercon.jp");

    await worker.email!(message, { ...makeEnv(), DISCORD_WEBHOOK_MAP: "not json" });

    expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
