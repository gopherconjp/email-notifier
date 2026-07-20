import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyDiscord } from "./discord.ts";
import type { ParsedEmail } from "./email.ts";
import { spyFetchError, spyFetchOk, WEBHOOK } from "./test/fixtures.ts";

const ELLIPSIS = "…";
const TRUNCATION_MARKER = "\n\n…(truncated)";

async function postedEmbed(email: ParsedEmail): Promise<unknown> {
  const fetchSpy = spyFetchOk();

  await notifyDiscord(WEBHOOK, email);

  const body = fetchSpy.mock.calls[0]![1]!.body as string;
  return JSON.parse(body).embeds[0];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notifyDiscord", () => {
  describe("positive", () => {
    it.each<{ name: string; email: ParsedEmail; embed: unknown }>([
      {
        name: "a normal email",
        email: {
          subject: "Weekly update",
          from: "Alice <alice@example.com>",
          text: "Body text here.",
        },
        embed: {
          title: "Weekly update",
          description: "Body text here.",
          fields: [{ name: "From", value: "Alice <alice@example.com>" }],
        },
      },
      {
        name: "an empty body",
        email: { subject: "s", from: "f", text: "" },
        embed: {
          title: "s",
          description: "(empty body)",
          fields: [{ name: "From", value: "f" }],
        },
      },
      {
        name: "an over-long body",
        email: { subject: "s", from: "f", text: "x".repeat(5000) },
        embed: {
          title: "s",
          description: "x".repeat(4096 - TRUNCATION_MARKER.length) + TRUNCATION_MARKER,
          fields: [{ name: "From", value: "f" }],
        },
      },
      {
        name: "an over-long subject",
        email: { subject: "T".repeat(400), from: "f", text: "b" },
        embed: {
          title: "T".repeat(256 - ELLIPSIS.length) + ELLIPSIS,
          description: "b",
          fields: [{ name: "From", value: "f" }],
        },
      },
    ])("posts the embed for $name", async ({ email, embed }) => {
      expect(await postedEmbed(email)).toEqual(embed);
    });
  });

  describe("negative", () => {
    it("throws when Discord responds with a non-2xx status", async () => {
      spyFetchError(500, "boom");

      await expect(
        notifyDiscord(WEBHOOK, { subject: "s", from: "f", text: "b" }),
      ).rejects.toThrow();
    });
  });
});
