import { parse } from 'yaml';
import { z } from 'zod';

export interface AIThreadReference {
  threadId: string;
  reason: string;
  overview?: string;
  tone?: string;
}

export interface AISearchFollowup {
  direction: 'broader' | 'narrower' | 'alternate';
  text: string;
}

export type AIResponseSegment =
  | { type: 'markdown'; content: string }
  | { type: 'thread'; reference: AIThreadReference };

const threadReferenceSchema = z.object({
  thread_id: z.string().regex(/^\d+$/),
  reason: z.string().trim().min(1).max(500),
  overview: z.string().trim().min(1).max(500).optional(),
  synopsis: z.string().trim().min(1).max(500).optional(),
  tone: z.string().trim().min(1).max(100).optional(),
  // 兼容旧会话；新提示词不再要求或展示这些字段。
  matches: z.array(z.string().trim().min(1).max(100)).max(6).optional(),
  caveat: z.string().trim().min(1).max(300).optional(),
}).strict();

const THREAD_BLOCK_PATTERN = /<thread>\s*([\s\S]*?)\s*<\/thread>/gi;
const FOLLOWUPS_BLOCK_PATTERN = /<followups>\s*([\s\S]*?)\s*<\/followups>/gi;
const followupsSchema = z.object({
  items: z.array(z.object({
    direction: z.enum(['broader', 'narrower', 'alternate']),
    text: z.string().trim().min(1).max(80),
  }).strict()).length(3),
}).strict().superRefine((value, context) => {
  if (new Set(value.items.map((item) => item.direction)).size !== 3) {
    context.addIssue({ code: 'custom', message: '追问方向必须各不相同' });
  }
  if (new Set(value.items.map((item) => item.text)).size !== 3) {
    context.addIssue({ code: 'custom', message: '追问内容必须各不相同' });
  }
});

export function extractAISearchFollowups(text: string) {
  let followups: AISearchFollowup[] = [];
  const content = text.replace(FOLLOWUPS_BLOCK_PATTERN, (_block, yaml: string) => {
    if (followups.length === 0) {
      try {
        followups = followupsSchema.parse(parse(yaml, { maxAliasCount: 0 })).items;
      } catch {
        // 无效的结构化追问不进入 UI，也不污染正文。
      }
    }
    return '';
  }).trim();
  return { content, followups };
}

export function getStreamingSafeContent(content: string) {
  const withoutCompletedBlocks = content
    .replace(/<think>\s*[\s\S]*?\s*<\/think>/gi, '')
    .replace(FOLLOWUPS_BLOCK_PATTERN, '');
  let safeEnd = withoutCompletedBlocks.length;
  for (const tag of ['thread', 'think', 'followups']) {
    const openIndex = withoutCompletedBlocks.lastIndexOf(`<${tag}>`);
    const closeIndex = withoutCompletedBlocks.lastIndexOf(`</${tag}>`);
    if (openIndex > closeIndex) safeEnd = Math.min(safeEnd, openIndex);
  }
  return withoutCompletedBlocks.slice(0, safeEnd);
}

function getXmlField(content: string, names: string[]) {
  for (const name of names) {
    const match = new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`, 'i').exec(content);
    if (match) return match[1].trim();
  }
  return undefined;
}

function parseXmlThreadReference(content: string) {
  const threadId = getXmlField(content, ['thread_id', 'threadId']);
  const reason = getXmlField(content, ['reason']);
  if (!threadId || !reason) return null;

  const matchesContent = getXmlField(content, ['matches']);
  const matches = matchesContent
    ? matchesContent
        .split('\n')
        .map((line) => line.trim().replace(/^[-*]\s*/, '').replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : undefined;

  return {
    thread_id: threadId,
    reason,
    overview: getXmlField(content, ['overview', 'synopsis']),
    tone: getXmlField(content, ['tone']),
    matches,
    caveat: getXmlField(content, ['caveat']),
  };
}

export function parseAIResponse(text: string, allowedThreadIds: Set<string>): AIResponseSegment[] {
  const segments: AIResponseSegment[] = [];
  let cursor = 0;
  let renderedThreads = 0;
  const renderedThreadIds = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = THREAD_BLOCK_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: 'markdown', content: text.slice(cursor, match.index) });
    }

    try {
      let rawReference: unknown;
      try {
        rawReference = parse(match[1], { maxAliasCount: 0 });
      } catch {
        rawReference = parseXmlThreadReference(match[1]);
      }
      if (!rawReference || typeof rawReference !== 'object') {
        rawReference = parseXmlThreadReference(match[1]);
      }
      const parsed = threadReferenceSchema.parse(rawReference);
      if (
        !allowedThreadIds.has(parsed.thread_id) ||
        renderedThreadIds.has(parsed.thread_id) ||
        renderedThreads >= 6
      ) {
        throw new Error('帖子引用不在允许范围内');
      }
      segments.push({
        type: 'thread',
        reference: {
          threadId: parsed.thread_id,
          reason: parsed.reason,
          overview: parsed.overview ?? parsed.synopsis,
          tone: parsed.tone,
        },
      });
      renderedThreadIds.add(parsed.thread_id);
      renderedThreads += 1;
    } catch {
      segments.push({ type: 'markdown', content: match[0] });
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ type: 'markdown', content: text.slice(cursor) });
  }

  return segments.filter((segment) => segment.type !== 'markdown' || segment.content.trim());
}
