import { describe, expect, it } from "vitest";

import { extractUsername, parseEmail, stripTag } from "./email.ts";
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

  describe("negative", () => {
    it("throws when the input is not an email address", () => {
      expect(() => extractUsername("not-an-address")).toThrow();
    });
  });
});

describe("stripTag", () => {
  describe("positive", () => {
    it.each([
      { username: "user1", stripped: "user1" },
      { username: "user1+news", stripped: "user1" },
      { username: "user1+news_archive", stripped: "user1" },
    ])("maps $username to '$stripped'", ({ username, stripped }) => {
      expect(stripTag(username)).toBe(stripped);
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
        to: "user1@gophercon.jp",
        // vitest types asymmetric matchers as `any`.
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        body: expect.stringContaining("This is the body."),
      });
    });

    it("falls back to '(no subject)' for an email with no subject", async () => {
      const mime = buildMime(
        { From: "Bob <bob@example.com>", To: "user1@gophercon.jp" },
        "Body without a subject.",
      );

      const parsed = await parseEmail(mimeStream(mime));

      expect(parsed).toEqual({
        subject: "(no subject)",
        from: "Bob <bob@example.com>",
        to: "user1@gophercon.jp",
        // vitest types asymmetric matchers as `any`.
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        body: expect.stringContaining("Body without a subject."),
      });
    });

    it.each([
      { html: "<p>Hello <b>world</b></p>", text: "Hello world" },
      {
        html: "<style>.a{color:red}</style><p>a &amp; b &lt;c&gt;</p><script>alert(1)</script>",
        text: "a & b <c>",
      },
    ])("converts an HTML-only body to text: $html", async ({ html, text }) => {
      const mime = buildMime(
        {
          From: "Bob <bob@example.com>",
          To: "user1@gophercon.jp",
          Subject: "s",
          "Content-Type": "text/html; charset=utf-8",
        },
        html,
      );

      const parsed = await parseEmail(mimeStream(mime));

      expect(parsed).toEqual({
        subject: "s",
        from: "Bob <bob@example.com>",
        to: "user1@gophercon.jp",
        body: text,
      });
    });
  });
});
