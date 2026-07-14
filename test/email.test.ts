import { describe, expect, it } from "vitest";
import { extractUsername, htmlToText, parseEmail } from "../src/email.ts";
import { buildMime, mimeStream } from "./fixtures.ts";

describe("extractUsername", () => {
  it("extracts the local part of a bare address", () => {
    expect(extractUsername("user1@gophercon.jp")).toBe("user1");
  });

  it("handles the display-name form", () => {
    expect(extractUsername("User One <user1@gophercon.jp>")).toBe("user1");
  });

  it("lower-cases the username for case-insensitive lookup", () => {
    expect(extractUsername("User1@gophercon.jp")).toBe("user1");
  });

  it("returns the whole trimmed string when there is no @", () => {
    expect(extractUsername("  user1  ")).toBe("user1");
  });

  it("returns an empty string for empty input", () => {
    expect(extractUsername("")).toBe("");
  });
});

describe("htmlToText", () => {
  it("strips tags and converts block breaks to newlines", () => {
    const text = htmlToText("<p>Hello <b>world</b></p><br>line2");
    expect(text).toContain("Hello world");
    expect(text).toContain("line2");
    expect(text).not.toContain("<");
  });

  it("removes script/style content and decodes entities", () => {
    const text = htmlToText(
      "<style>.a{color:red}</style><p>a &amp; b &lt;c&gt;</p><script>alert(1)</script>",
    );
    expect(text).toContain("a & b <c>");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
  });
});

describe("parseEmail", () => {
  const mime = buildMime(
    {
      From: "Alice <alice@example.com>",
      To: "user1@gophercon.jp",
      Subject: "Hello World",
      "Content-Type": "text/plain; charset=utf-8",
    },
    "This is the body.",
  );

  it("extracts subject, from and text body", async () => {
    const parsed = await parseEmail(mimeStream(mime));
    expect(parsed.subject).toBe("Hello World");
    expect(parsed.from).toBe("Alice <alice@example.com>");
    expect(parsed.text).toContain("This is the body.");
  });

  it("falls back to sensible defaults for a minimal message", async () => {
    const parsed = await parseEmail(mimeStream("\r\n\r\nbody only"));
    expect(parsed.subject).toBe("(no subject)");
    expect(parsed.from).toBe("(unknown sender)");
  });
});
