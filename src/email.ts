import PostalMime from "postal-mime";

/**
 * Extract the username (local part) from an email address.
 *
 * Handles bare addresses ("user1@gophercon.jp") as well as the
 * "Display Name <user1@gophercon.jp>" form, returning a lower-cased username
 * so lookups against the webhook map are case-insensitive. Returns an empty
 * string when no local part can be found.
 */
export function extractUsername(address: string): string {
  if (!address) return "";

  // Prefer the address inside angle brackets when present.
  const angle = address.match(/<([^>]+)>/);
  const raw = (angle ? angle[1] : address).trim();

  const at = raw.lastIndexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  return local.trim().toLowerCase();
}

/** Parsed, human-readable representation of an incoming email. */
export interface ParsedEmail {
  subject: string;
  from: string;
  text: string;
}

/**
 * Parse an incoming email into subject / from / plain-text body.
 *
 * postal-mime handles multipart, transfer encodings (base64/quoted-printable)
 * and character sets. When only an HTML body is available it is converted to a
 * best-effort plain-text representation.
 */
export async function parseEmail(
  raw: ReadableStream<Uint8Array> | ArrayBuffer,
): Promise<ParsedEmail> {
  const email = await PostalMime.parse(raw);

  const subject = email.subject?.trim() || "(no subject)";

  const sender = email.from;
  let from = "(unknown sender)";
  if (sender?.name) {
    from = `${sender.name} <${sender.address ?? ""}>`;
  } else if (sender?.address) {
    from = sender.address;
  }

  let text = email.text?.trim() ?? "";
  if (!text && email.html) {
    text = htmlToText(email.html);
  }

  return { subject, from, text };
}

const HTML_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
};

/**
 * Minimal, dependency-free HTML -> text conversion. Not a full renderer: it
 * strips scripts/styles and tags, decodes a handful of common entities, and
 * collapses excess whitespace. Good enough for a readable Discord notification.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(
      /&(nbsp|amp|lt|gt|quot|#39|apos);/gi,
      (match, entity: string) => HTML_ENTITIES[entity.toLowerCase()] ?? match,
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
