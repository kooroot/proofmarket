export interface SseFrame {
  id?: string;
  event?: string; // "heartbeat" for keep-alives
  data: string;
}

/** Parse one SSE block (text between two blank lines). Returns null for comment/empty-only blocks. */
export function parseSseBlock(block: string): SseFrame | null {
  let id: string | undefined;
  let event: string | undefined;
  const data: string[] = [];
  for (const raw of block.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line === "" || line.startsWith(":")) continue; // blank or SSE comment
    if (line.startsWith("id:")) id = line.slice(3).trimStart();
    else if (line.startsWith("event:")) event = line.slice(6).trimStart();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    // NOTE: do NOT support the repo's broken "Message: " variant (mis-slices prefix, TECH-REF §11).
  }
  if (data.length === 0 && id === undefined && event === undefined) return null;
  return { id, event, data: data.join("\n") };
}

/** Pull complete frames out of a rolling buffer; return the unparsed remainder. */
export function splitSseStream(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let rest = buffer;
  while (true) {
    const m = rest.match(/\r?\n\r?\n/);
    if (!m || m.index === undefined) break;
    frames.push(rest.slice(0, m.index));
    rest = rest.slice(m.index + m[0].length);
  }
  return { frames, rest };
}
