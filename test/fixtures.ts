/** Build a raw MIME message from headers and a body. */
export function buildMime(
  headers: Record<string, string>,
  body: string,
): string {
  const head = Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\r\n");
  return `${head}\r\n\r\n${body}\r\n`;
}

/** Wrap a raw MIME string as a `ReadableStream`, as `message.raw` provides. */
export function mimeStream(mime: string): ReadableStream<Uint8Array> {
  return new Response(mime).body!;
}
