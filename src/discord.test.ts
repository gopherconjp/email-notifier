import { describe, expect, it } from "vitest";
import { buildDiscordPayload, type DiscordEmbed } from "./discord.ts";
import type { ParsedEmail } from "./email.ts";

function embedOf(email: ParsedEmail): DiscordEmbed {
  return buildDiscordPayload(email).embeds[0]!;
}

describe("buildDiscordPayload", () => {
  describe("positive", () => {
    it("maps subject to title, body to description and sender to a From field", () => {
      const embed = embedOf({
        subject: "Weekly update",
        from: "Alice <alice@example.com>",
        text: "Body text here.",
      });

      expect(embed.title).toBe("Weekly update");
      expect(embed.description).toBe("Body text here.");
      expect(embed.fields[0]).toEqual({
        name: "From",
        value: "Alice <alice@example.com>",
      });
    });

    it("shows a placeholder description for an empty body", () => {
      const embed = embedOf({ subject: "s", from: "f", text: "" });
      expect(embed.description).toBe("(empty body)");
    });

    it("appends a truncation marker to an over-long body", () => {
      const embed = embedOf({ subject: "s", from: "f", text: "x".repeat(5000) });
      expect(embed.description).toContain("…(truncated)");
    });

    it("caps the title at Discord's 256-character limit", () => {
      const embed = embedOf({ subject: "T".repeat(400), from: "f", text: "b" });
      expect(embed.title.length).toBeLessThanOrEqual(256);
    });

    it("caps the description at Discord's 4096-character limit", () => {
      const embed = embedOf({ subject: "s", from: "f", text: "x".repeat(5000) });
      expect(embed.description.length).toBeLessThanOrEqual(4096);
    });
  });
});
