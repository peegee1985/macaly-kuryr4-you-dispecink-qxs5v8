// Build trigger: rebuild driver AAB and dispatcher APK after Expo credits restored.
export type MessageSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; url: string };

const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;
const TRAILING = /[.,!?;:]+$/;

export function normalizeMessageLink(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function linkifyMessage(value: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const trailing = raw.match(TRAILING)?.[0] ?? "";
    const link = trailing ? raw.slice(0, -trailing.length) : raw;

    if (index > cursor) segments.push({ kind: "text", text: value.slice(cursor, index) });
    segments.push({ kind: "link", text: link, url: normalizeMessageLink(link) });
    if (trailing) segments.push({ kind: "text", text: trailing });
    cursor = index + raw.length;
  }

  if (cursor < value.length) segments.push({ kind: "text", text: value.slice(cursor) });
  if (segments.length === 0 && value) segments.push({ kind: "text", text: value });
  return segments;
}
