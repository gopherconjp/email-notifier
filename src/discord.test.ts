import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyDiscord } from "./discord.ts";
import type { ParsedEmail } from "./email.ts";
import { spyFetchOk, WEBHOOK_ENDPOINT } from "./test/fixtures.ts";

const ELLIPSIS = "…";
const TRUNCATION_MARKER = "\n\n… (以下省略)";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = spyFetchOk();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// oxlint-disable-next-line typescript/no-restricted-types
const postedEmbed = async (email: ParsedEmail): Promise<unknown> => {
  await notifyDiscord(WEBHOOK_ENDPOINT, email);

  const body = fetchSpy.mock.calls[0]![1]!.body as string;
  return JSON.parse(body).embeds[0];
};

describe("notifyDiscord", () => {
  describe("positive", () => {
    // oxlint-disable-next-line typescript/no-restricted-types
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
          description: "x".repeat(4096 - TRUNCATION_MARKER.length) + TRUNCATION_MARKER,
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
          title: "T".repeat(256 - ELLIPSIS.length) + ELLIPSIS,
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
