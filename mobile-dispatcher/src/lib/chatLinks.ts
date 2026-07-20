export type ChatTextPart = {
  text: string;
  url?: string;
};

// Covers explicit HTTP(S), www links and bare domains, including paths/query strings.
const URL_CANDIDATE = /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:\/[^\s<>"']*)?/giu;
const TRAILING_PUNCTUATION = /[.,!?;:)}\]]+$/u;

export function normalizeChatUrl(value: string): string {
  return /^https?:\/\//iu.test(value) ? value : `https://${value}`;
}

export function splitChatLinks(text: string): ChatTextPart[] {
  const parts: ChatTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_CANDIDATE)) {
    const start = match.index ?? 0;
    const raw = match[0];
    if (start > 0 && text[start - 1] === "@") continue;

    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const linkText = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!linkText) continue;

    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    parts.push({ text: linkText, url: normalizeChatUrl(linkText) });
    if (trailing) parts.push({ text: trailing });
    cursor = start + raw.length;
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length > 0 ? parts : [{ text }];
}
