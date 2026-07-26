import { useMemo } from 'react';

import { Spoiler } from '@/shared/ui/Spoiler';

interface DiscordMarkdownTextProps {
  text: string;
  className?: string;
  truncateClassName?: string;
}

type MarkdownPart =
  | { type: 'text' | 'spoiler' | 'bold' | 'code'; content: string }
  | { type: 'link'; text: string; url: string };

// 简易行内 Markdown 解析器
// 匹配: 链接 [text](url) | 剧透 ||text|| | 粗体 **text** | 行内代码 `code`
function parseDiscordMarkdown(text: string): MarkdownPart[] {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\|\|(.+?)\|\||\*\*([^*]+)\*\*|`([^`]+)`/g;
  const parts: MarkdownPart[] = [];
  let lastIndex = 0;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] && match[2]) {
      // 匹配到链接
      parts.push({ type: 'link', text: match[1], url: match[2] });
    } else if (match[3]) {
      parts.push({ type: 'spoiler', content: match[3] });
    } else if (match[4]) {
      // 匹配到粗体
      parts.push({ type: 'bold', content: match[4] });
    } else if (match[5]) {
      // 匹配到代码块
      parts.push({ type: 'code', content: match[5] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
}

export function DiscordMarkdownText({ text, className = '', truncateClassName = '' }: DiscordMarkdownTextProps) {
  // 列表页每张卡片的摘要都要经过这里，解析结果按 text 缓存，
  // 与 MarkdownText 的 useMemo 策略保持一致。
  const parts = useMemo(() => (text ? parseDiscordMarkdown(text) : []), [text]);

  if (!text) return null;

  return (
    <span className={`inline ${className} ${truncateClassName}`}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-(--od-accent) hover:underline"
              onClick={(e) => e.stopPropagation()}
              title={part.url}
            >
              {part.text}
            </a>
          );
        }
        if (part.type === 'spoiler') {
          return <Spoiler key={index}>{part.content}</Spoiler>;
        }
        if (part.type === 'bold') {
          return <strong key={index} className="font-bold text-(--od-text-primary)">{part.content}</strong>;
        }
        if (part.type === 'code') {
          return <code key={index} className="rounded-md bg-(--od-surface-shelled) px-1 py-0.5 font-mono text-[0.85em] text-(--od-text-primary)">{part.content}</code>;
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}
