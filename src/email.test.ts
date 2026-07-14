import { describe, expect, it } from "vitest";
import { extractUsername, htmlToText, parseEmail } from "./email.ts";
import { buildMime, mimeStream } from "./test/fixtures.ts";

describe("extractUsername", () => {
  describe("positive", () => {
    it.each([
      { address: "user1@gophercon.jp", username: "user1" },
      { address: "User1@gophercon.jp", username: "user1" },
    ])("maps $address to '$username'", ({ address, username }) => {
      expect(extractUsername(address)).toBe(username);
    });
  });
});

describe("htmlToText", () => {
  describe("positive", () => {
    it.each([
      { html: "plain text", text: "plain text" },
      { html: "<p>Hello <b>world</b></p><br>line2", text: "Hello world\n\nline2" },
    ])("renders $html", ({ html, text }) => {
      expect(htmlToText(html)).toBe(text);
    });

    it("strips script/style content and decodes entities", () => {
      expect(
        htmlToText(
          "<style>.a{color:red}</style><p>a &amp; b &lt;c&gt;</p><script>alert(1)</script>",
        ),
      ).toBe("a & b <c>");
    });
  });
});

describe("parseEmail", () => {
  describe("positive", () => {
    it("extracts subject, sender and text body from a MIME message", async () => {
      const mime = buildMime(
        {
          From: "Alice <alice@example.com>",
          To: "user1@gophercon.jp",
          Subject: "Hello World",
          "Content-Type": "text/plain; charset=utf-8",
        },
        "This is the body.",
      );

      const parsed = await parseEmail(mimeStream(mime));

      expect(parsed).toEqual({
        subject: "Hello World",
        from: "Alice <alice@example.com>",
        text: expect.stringContaining("This is the body."),
      });
    });

    it("falls back to '(no subject)' for an email with no subject", async () => {
      const mime = buildMime(
        { From: "Bob <bob@example.com>", To: "user1@gophercon.jp" },
        "Body without a subject.",
      );

      const parsed = await parseEmail(mimeStream(mime));

      expect(parsed.subject).toBe("(no subject)");
      expect(parsed.from).toBe("Bob <bob@example.com>");
    });
  });
});
