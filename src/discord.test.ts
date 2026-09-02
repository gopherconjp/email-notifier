import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TRUNC_MARKER_SHORT, notifyDiscord, TRUNC_MARKER_LONG } from "./discord.ts";
import type { ParsedEmail } from "./email.ts";
import { spyFetchOk, WEBHOOK_ENDPOINT } from "./test/fixtures.ts";

let fetchSpy: ReturnType<typeof spyFetchOk>;

beforeEach(() => {
  fetchSpy = spyFetchOk();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const postedEmbed = async (email: ParsedEmail): Promise<unknown> => {
  await notifyDiscord(WEBHOOK_ENDPOINT, email);

  // @discordjs/rest sends the payload as a JSON string, but RequestInit.body is
  // typed broadly and JSON.parse yields `any`.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access
  return JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).embeds[0];
};

describe("notifyDiscord", () => {
  describe("positive", () => {
    it.each<{ name: string; email: ParsedEmail; embed: unknown }>([
      {
        name: "a normal email",
        email: {
          subject: "Weekly update",
          from: "Alice <alice@example.com>",
          to: "user1@gophercon.jp",
          body: "Body text here.",
        },
        embed: {
          title: "Weekly update",
          description: "Body text here.",
          fields: [
            { name: "From", value: "Alice <alice@example.com>" },
            { name: "To", value: "user1@gophercon.jp" },
          ],
        },
      },
      {
        name: "an empty body",
        email: { subject: "s", from: "f", to: "t", body: "" },
        embed: {
          title: "s",
          description: "(empty body)",
          fields: [
            { name: "From", value: "f" },
            { name: "To", value: "t" },
          ],
        },
      },
      {
        name: "an over-long body",
        email: { subject: "s", from: "f", to: "t", body: "x".repeat(5000) },
        embed: {
          title: "s",
          description: "x".repeat(4096 - TRUNC_MARKER_LONG.length) + TRUNC_MARKER_LONG,
          fields: [
            { name: "From", value: "f" },
            { name: "To", value: "t" },
          ],
        },
      },
      {
        name: "an over-long subject",
        email: { subject: "T".repeat(400), from: "f", to: "t", body: "b" },
        embed: {
          title: "T".repeat(256 - TRUNC_MARKER_SHORT.length) + TRUNC_MARKER_SHORT,
          description: "b",
          fields: [
            { name: "From", value: "f" },
            { name: "To", value: "t" },
          ],
        },
      },
    ])("posts the embed for $name", async ({ email, embed }) => {
      expect(await postedEmbed(email)).toEqual(embed);
    });
  });

  describe("negative", () => {
    it("throws when Discord responds with a non-2xx status", async () => {
      fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));

      await expect(
        notifyDiscord(WEBHOOK_ENDPOINT, { subject: "s", from: "f", to: "t", body: "b" }),
      ).rejects.toThrow();
    });
  });
});
