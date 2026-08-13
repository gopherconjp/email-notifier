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

const formatAddress = (contact?: { name?: string; address?: string }): string => {
  if (!contact) return "(unknown)";

  if (contact.name) return `${contact.name} <${contact.address ?? ""}>`;
  return contact.address ?? "(unknown)";
};

export const parseEmail = (raw: ReadableStream<Uint8Array> | ArrayBuffer): Promise<ParsedEmail> =>
  PostalMime.parse(raw).then((email) => {
    const subject = email.subject?.trim() || "(no subject)";

    const from = formatAddress(email.from);
    const to = formatAddress(email.to?.[0]);

    let body = email.text?.trim() ?? "";
    if (!body && email.html) {
      body = htmlToText(email.html);
    }

    return { subject, from, to, body };
  });

const HTML_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
};

const htmlToText = (html: string): string =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (match, entity: string) => HTML_ENTITIES[entity.toLowerCase()] ?? match)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
