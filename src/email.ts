import PostalMime from "postal-mime";

export function extractUsername(address: string): string {
  if (!address) return "";

  const angle = address.match(/<([^>]+)>/);
  const raw = (angle ? angle[1] : address).trim();

  const at = raw.lastIndexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  return local.trim().toLowerCase();
}

export interface ParsedEmail {
  subject: string;
  from: string;
  text: string;
}

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
