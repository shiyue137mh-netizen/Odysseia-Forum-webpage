export interface AISearchInlineToken {
  type: 'tag' | 'author' | 'channel';
  value: string;
}

export type AISearchInlineSegment =
  | { type: 'markdown'; content: string }
  | { type: 'token'; token: AISearchInlineToken };

const TOKEN_PATTERN = /\$(tag|author|channel):([^$\n]+)\$/g;
const CODE_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;

function parsePlainText(content: string, segments: AISearchInlineSegment[], tokenLimit: number) {
  let cursor = 0;
  let tokenCount = segments.filter((segment) => segment.type === 'token').length;
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;

  while (tokenCount < tokenLimit && (match = TOKEN_PATTERN.exec(content)) !== null) {
    const type = match[1] as AISearchInlineToken['type'];
    const value = match[2].trim();
    const valid = value.length > 0 && value.length <= 80 && (
      type === 'tag' || /^\d+$/.test(value)
    );
    if (!valid) continue;
    if (match.index > cursor) segments.push({ type: 'markdown', content: content.slice(cursor, match.index) });
    segments.push({ type: 'token', token: { type, value } });
    tokenCount += 1;
    cursor = match.index + match[0].length;
  }

  if (cursor < content.length) segments.push({ type: 'markdown', content: content.slice(cursor) });
}

export function parseAISearchInlineTokens(text: string, tokenLimit = 20): AISearchInlineSegment[] {
  const segments: AISearchInlineSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  CODE_PATTERN.lastIndex = 0;

  while ((match = CODE_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) parsePlainText(text.slice(cursor, match.index), segments, tokenLimit);
    segments.push({ type: 'markdown', content: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parsePlainText(text.slice(cursor), segments, tokenLimit);

  return segments.filter((segment) => segment.type !== 'markdown' || segment.content.length > 0);
}
