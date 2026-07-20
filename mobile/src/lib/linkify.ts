// Build trigger: rebuild driver AAB and dispatcher APK after Expo credits restored.
export type MessageSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; url: string };

const LINK_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+|(?:mailto:)?[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+|(?:tel:|geo:)[^\s<>"']+|(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?:\/[^\s<>"']*)?|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,63}(?::\d{2,5})?(?:\/[^\s<>"']*)?/giu;

const SIMPLE_TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ";", ":"]);
const BRACKET_PAIRS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function count(value: string, character: string) {
  return [...value].filter((item) => item === character).length;
}

function splitTrailingPunctuation(value: string) {
  let link = value;
  let trailing = "";
  while (link) {
    const last = link.at(-1);
    if (!last) break;
    if (SIMPLE_TRAILING_PUNCTUATION.has(last)) {
      trailing = last + trailing;
      link = link.slice(0, -1);
      continue;
    }
    const opening = BRACKET_PAIRS[last];
    if (opening && count(link, last) > count(link, opening)) {
      trailing = last + trailing;
      link = link.slice(0, -1);
      continue;
    }
    break;
  }
  return { link, trailing };
}

export function normalizeMessageLink(value: string) {
  if (/^(?:https?:\/\/|mailto:|tel:|geo:)/i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}

export function linkifyMessage(value: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const { link, trailing } = splitTrailingPunctuation(raw);
    if (!link) continue;
    if (index > cursor) segments.push({ kind: "text", text: value.slice(cursor, index) });
    segments.push({ kind: "link", text: link, url: normalizeMessageLink(link) });
    if (trailing) segments.push({ kind: "text", text: trailing });
    cursor = index + raw.length;
  }
  if (cursor < value.length) segments.push({ kind: "text", text: value.slice(cursor) });
  if (segments.length === 0 && value) segments.push({ kind: "text", text: value });
  return segments;
}
