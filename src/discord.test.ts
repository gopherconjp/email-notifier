import { describe, expect, it } from "vitest";
import { buildDiscordPayload, type DiscordEmbed } from "./discord.ts";
import type { ParsedEmail } from "./email.ts";

function embedOf(email: ParsedEmail): DiscordEmbed {
  return buildDiscordPayload(email).embeds[0]!;
}

const ELLIPSIS = "…";
const TRUNCATION_MARKER = "\n\n…(truncated)";

describe("buildDiscordPayload", () => {
  describe("positive", () => {
    it.each<{ name: string; email: ParsedEmail; embed: DiscordEmbed }>([
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
    ])("builds the embed for $name", ({ email, embed }) => {
      expect(embedOf(email)).toEqual(embed);
    });
  });
});
