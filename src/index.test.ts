import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { parseWebhookMap } from "./index.ts";
import { makeEnv, makeMessage, WEBHOOK } from "./test/fixtures.ts";

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
