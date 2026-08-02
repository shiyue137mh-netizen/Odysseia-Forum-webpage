export type AISearchComposerTokenType = 'tag' | 'author' | 'channel';

export type AISearchComposerSegment =
  | { type: 'text'; content: string; start: number; end: number }
  | {
      type: 'token';
      token: { type: AISearchComposerTokenType; value: string };
      raw: string;
      start: number;
      end: number;
    };

const TOKEN_PATTERN = /\$(tag|author|channel):([^$]+)\$/g;

function isValidToken(type: AISearchComposerTokenType, value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return false;
  return type === 'tag' || /^\d+$/.test(trimmed);
}

export function parseAISearchComposer(value: string): AISearchComposerSegment[] {
  const segments: AISearchComposerSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_PATTERN.exec(value)) !== null) {
    const type = match[1] as AISearchComposerTokenType;
    const tokenValue = match[2].trim();
    if (!isValidToken(type, tokenValue)) continue;
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: value.slice(lastIndex, match.index), start: lastIndex, end: match.index });
    }
    segments.push({
      type: 'token',
      token: { type, value: tokenValue },
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length || segments.length === 0) {
    segments.push({ type: 'text', content: value.slice(lastIndex), start: lastIndex, end: value.length });
  }
  return segments;
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (!(node instanceof HTMLElement)) return '';
  const tokenRaw = node.dataset.aiTokenRaw;
  if (tokenRaw) return tokenRaw;
  if (node.tagName === 'BR') return '\n';
  const content = Array.from(node.childNodes).map(serializeNode).join('');
  return node.tagName === 'DIV' || node.tagName === 'P' ? `${content}\n` : content;
}

export function serializeAISearchComposer(root: HTMLElement) {
  return Array.from(root.childNodes).map(serializeNode).join('').replace(/\n$/, '');
}

function nodeLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length || 0;
  if (!(node instanceof HTMLElement)) return 0;
  if (node.dataset.aiTokenRaw) return node.dataset.aiTokenRaw.length;
  if (node.tagName === 'BR') return 1;
  return Array.from(node.childNodes).reduce((length, child) => length + nodeLength(child), 0);
}

export function getAISearchComposerCaret(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) && range.startContainer !== root) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const fragment = before.cloneContents();
  return Array.from(fragment.childNodes).reduce((length, child) => length + nodeLength(child), 0);
}

export function setAISearchComposerCaret(root: HTMLElement, offset: number) {
  const range = document.createRange();
  const selection = window.getSelection();
  let remaining = Math.max(0, offset);

  const visit = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        return true;
      }
      remaining -= length;
      return false;
    }
    if (node instanceof HTMLElement && node.dataset.aiTokenRaw) {
      const length = node.dataset.aiTokenRaw.length;
      if (remaining <= length) {
        const parent = node.parentNode;
        if (!parent) return false;
        const index = Array.prototype.indexOf.call(parent.childNodes, node);
        range.setStart(parent, index + (remaining > length / 2 ? 1 : 0));
        return true;
      }
      remaining -= length;
      return false;
    }
    if (node instanceof HTMLElement && node.tagName === 'BR') {
      if (remaining <= 1) {
        const parent = node.parentNode;
        if (!parent) return false;
        range.setStart(parent, Array.prototype.indexOf.call(parent.childNodes, node) + 1);
        return true;
      }
      remaining -= 1;
      return false;
    }
    return Array.from(node.childNodes).some(visit);
  };

  if (!visit(root)) range.selectNodeContents(root), range.collapse(false);
  else range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
