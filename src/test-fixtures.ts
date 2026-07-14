export function buildMime(headers: Record<string, string>, body: string): string {
  const head = Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\r\n");
  return `${head}\r\n\r\n${body}\r\n`;
}

export function mimeStream(mime: string): ReadableStream<Uint8Array> {
  return new Response(mime).body!;
}
