import { Check, ChevronDown, FileText, LoaderCircle, Search, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import type { AISearchTraceItem } from '@/features/ai-search/lib/session';

export function AISearchReasoning({
  content,
  trace = [],
  isStreaming = false,
  hasAnswer = false,
}: {
  content: string;
  trace?: AISearchTraceItem[];
  isStreaming?: boolean;
  hasAnswer?: boolean;
}) {
  const items: AISearchTraceItem[] = trace.length
    ? trace
    : content.trim()
      ? [{ type: 'reasoning', content }]
      : [];
  if (items.length === 0) return null;

  return (
    <ReasoningDetails
      key={`${isStreaming}-${hasAnswer}`}
      items={items}
      initiallyOpen={isStreaming && !hasAnswer}
    />
  );
}

function ReasoningDetails({
  items,
  initiallyOpen,
}: {
  items: AISearchTraceItem[];
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group mb-5 text-xs leading-6 text-(--od-text-tertiary)"
    >
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-medium transition-colors hover:text-(--od-text-secondary)">
        <span>查看思考过程</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-4 border-l border-(--od-shell-line) pl-4">
        {items.map((item, index) => {
          if (item.type === 'reasoning') {
            return (
              <p key={`reasoning-${index}`} className="whitespace-pre-wrap">
                {item.content}
              </p>
            );
          }

          if (item.type === 'text') {
            return (
              <div key={`text-${index}`} className="space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-(--od-text-secondary)">
                  <FileText className="h-3.5 w-3.5 text-(--od-accent)" />
                  <span>中途正文</span>
                </div>
                <p className="whitespace-pre-wrap text-(--od-text-secondary)">{item.content}</p>
              </div>
            );
          }

          const ToolIcon = item.tool === 'search_threads' || item.tool === 'search_tournaments'
            ? Search
            : FileText;
          const StatusIcon = item.status === 'running'
            ? LoaderCircle
            : item.status === 'complete'
              ? Check
              : TriangleAlert;
          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-(--od-text-secondary)">
                <ToolIcon className="h-3.5 w-3.5 text-(--od-accent)" />
                <span>工具调用：{item.label}</span>
                <StatusIcon
                  className={`h-3.5 w-3.5 ${
                    item.status === 'running'
                      ? 'animate-spin text-(--od-accent)'
                      : item.status === 'error'
                        ? 'text-(--od-error)'
                        : 'text-(--od-success)'
                  }`}
                />
              </div>
              <p className="[overflow-wrap:anywhere]">参数：{item.parameters}</p>
              {item.result && (
                <p className={item.status === 'error' ? 'text-(--od-error)' : ''}>
                  结果：{item.result}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
