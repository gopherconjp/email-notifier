import { htmlToText } from "html-to-text";
import PostalMime from "postal-mime";

export const extractUsername = (address: string): string => {
  const at = address.lastIndexOf("@");
  if (at === -1) {
    throw new Error(`Not an email address: ${address}`);
  }

  return address.slice(0, at).toLowerCase();
};

export const stripTag = (username: string): string => {
  const plus = username.indexOf("+");
  return plus === -1 ? username : username.slice(0, plus);
};

export interface ParsedEmail {
  subject: string;
  from: string;
  to: string;
  body: string;
}

export const parseEmail = (raw: ReadableStream<Uint8Array> | ArrayBuffer): Promise<ParsedEmail> =>
  PostalMime.parse(raw).then((email) => {
    const subject = email.subject?.trim() || "(no subject)";

    const from = formatAddress(email.from);
    const to = formatAddress(email.to?.[0]);

    let body = email.text?.trim() ?? "";
    if (!body && email.html) {
      body = htmlToText(email.html, {
        wordwrap: false,
        selectors: [
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
        ],
      });
    }

    return { subject, from, to, body };
  });

const formatAddress = (contact?: { name?: string; address?: string }): string => {
  if (!contact) return "(unknown)";

  if (contact.name) return `${contact.name} <${contact.address ?? ""}>`;
  return contact.address ?? "(unknown)";
};
