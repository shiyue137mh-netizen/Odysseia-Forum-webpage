export interface AISearchMentionTrigger {
  query: string;
  start: number;
  end: number;
}

export function findAISearchMentionTrigger(value: string, caret: number): AISearchMentionTrigger | null {
  const beforeCaret = value.slice(0, caret);
  const match = /(?:^|[^A-Za-z0-9._%+-])@([^\s@]*)$/.exec(beforeCaret);
  if (!match) return null;
  return {
    query: match[1],
    start: caret - match[1].length - 1,
    end: caret,
  };
}

export function insertAISearchLineBreak(value: string, start: number, end: number) {
  const nextValue = `${value.slice(0, start)}\n${value.slice(end)}`;
  return { value: nextValue, caret: start + 1 };
}

export function applyAISearchMentionToken(
  currentValue: string,
  trigger: AISearchMentionTrigger,
  type: 'tag' | 'author' | 'channel',
  value: string,
) {
  const raw = `$${type}:${value.trim()}$`;
  const after = currentValue.slice(trigger.end);
  const separator = /^\s/.test(after) ? '' : ' ';
  return {
    value: `${currentValue.slice(0, trigger.start)}${raw}${separator}${after}`,
    // 光标必须进入 Token 后的可编辑文本节点；停在 contentEditable=false 边界会吞掉中文拼音首键。
    caret: trigger.start + raw.length + 1,
  };
}
