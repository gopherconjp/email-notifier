import { describe, expect, it } from "vitest";
import { buildDiscordPayload } from "../src/discord.ts";
import type { ParsedEmail } from "../src/email.ts";

interface Embed {
  title: string;
  description: string;
  fields: { name: string; value: string }[];
}

function embedOf(payload: unknown): Embed {
  return (payload as { embeds: Embed[] }).embeds[0];
}

describe("buildDiscordPayload", () => {
  it("puts subject in the title, sender in a field, body in the description", () => {
    const email: ParsedEmail = {
      subject: "Weekly update",
      from: "Alice <alice@example.com>",
      text: "Body text here.",
    };
    const embed = embedOf(buildDiscordPayload(email));
    expect(embed.title).toBe("Weekly update");
    expect(embed.description).toBe("Body text here.");
    expect(embed.fields[0]).toEqual({
      name: "From",
      value: "Alice <alice@example.com>",
    });
  });

  it("trims an over-long body and marks it truncated", () => {
    const email: ParsedEmail = {
      subject: "s",
      from: "f",
      text: "x".repeat(5000),
    };
    const embed = embedOf(buildDiscordPayload(email));
    expect(embed.description.length).toBeLessThanOrEqual(4096);
    expect(embed.description).toContain("…(truncated)");
  });

  it("trims an over-long subject to the Discord title limit", () => {
    const email: ParsedEmail = {
      subject: "T".repeat(400),
      from: "f",
      text: "body",
    };
    const embed = embedOf(buildDiscordPayload(email));
    expect(embed.title.length).toBeLessThanOrEqual(256);
  });

  it("uses a placeholder for an empty body", () => {
    const embed = embedOf(
      buildDiscordPayload({ subject: "s", from: "f", text: "" }),
    );
    expect(embed.description).toBe("(empty body)");
  });
});
