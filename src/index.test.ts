import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import worker from "./index.ts";
import { makeEnv, makeMessage, spyFetchOk, WEBHOOK } from "./test/fixtures.ts";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = spyFetchOk();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("email handler", () => {
  describe("positive", () => {
    it.each([
      { address: "user1@gophercon.jp", forwardTo: "user1@forward.example.com" },
      { address: "user1+news@gophercon.jp", forwardTo: "user1+news@forward.example.com" },
    ])(
      "forwards $address to $forwardTo and notifies its mapped webhook",
      async ({ address, forwardTo }) => {
        const { message, forward } = makeMessage(address);

        await worker.email!(message, makeEnv());

        expect(forward).toHaveBeenCalledWith(forwardTo);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy.mock.calls[0]![0]).toBe(WEBHOOK);
      },
    );

    it("forwards without notifying when the username has no webhook", async () => {
      const { message, forward } = makeMessage("nobody@gophercon.jp");

      await worker.email!(message, makeEnv());

      expect(forward).toHaveBeenCalledWith("nobody@forward.example.com");
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("semi-positive", () => {
    it.each([{ map: "not json" }, { map: "[1,2]" }])(
      "forwards without notifying when DISCORD_WEBHOOK_MAP is $map",
      async ({ map }) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { message, forward } = makeMessage("user1@gophercon.jp");

        await worker.email!(message, { ...makeEnv(), DISCORD_WEBHOOK_MAP: map });

        expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
        expect(fetchSpy).not.toHaveBeenCalled();
      },
    );
  });

  describe("negative", () => {
    it("still forwards when the Discord webhook responds with an error", async () => {
      fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { message, forward } = makeMessage("user1@gophercon.jp");

      await expect(worker.email!(message, makeEnv())).resolves.toBeUndefined();

      expect(forward).toHaveBeenCalledWith("user1@forward.example.com");
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
