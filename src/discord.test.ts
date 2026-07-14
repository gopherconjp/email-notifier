import { describe, expect, it } from "vitest";
import { buildDiscordPayload } from "./discord.ts";
import type { ParsedEmail } from "./email.ts";

interface Embed {
  title: string;
  description: string;
  fields: { name: string; value: string }[];
}

function embedOf(email: ParsedEmail): Embed {
  return (buildDiscordPayload(email) as { embeds: Embed[] }).embeds[0]!;
}

describe("positive", () => {
  it("buildDiscordPayload maps subject to title, body to description and sender to a From field", () => {
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
});

describe("semi-positive", () => {
  it("buildDiscordPayload shows a placeholder description for an empty body", () => {
    const embed = embedOf({ subject: "s", from: "f", text: "" });
    expect(embed.description).toBe("(empty body)");
  });

  it("buildDiscordPayload appends a truncation marker to an over-long body", () => {
    const embed = embedOf({ subject: "s", from: "f", text: "x".repeat(5000) });
    expect(embed.description).toContain("…(truncated)");
  });

  it.each<{ field: "title" | "description"; email: ParsedEmail; limit: number }>([
    { field: "title", email: { subject: "T".repeat(400), from: "f", text: "b" }, limit: 256 },
    { field: "description", email: { subject: "s", from: "f", text: "x".repeat(5000) }, limit: 4096 },
  ])("buildDiscordPayload keeps the embed $field within Discord's $limit-character limit", ({ field, email, limit }) => {
    expect(embedOf(email)[field].length).toBeLessThanOrEqual(limit);
  });
});
