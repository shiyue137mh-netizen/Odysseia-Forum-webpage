import { useMemo } from 'react';

import type { Thread } from '@/entities/thread/types';
import type { AISearchTraceItem } from '@/features/ai-search/lib/session';
import { AISearchThreadReference } from '@/features/ai-search/components/AISearchThreadReference';
import { AISearchReasoning } from '@/features/ai-search/components/AISearchReasoning';
import { AISearchTokenizedMarkdown } from '@/features/ai-search/components/AISearchTokenizedMarkdown';
import type { AISearchMentionChannel } from '@/features/ai-search/components/AISearchTokenInput';
import type { AISearchInlineToken } from '@/features/ai-search/lib/inlineTokens';
import { getStreamingSafeContent, parseAIResponse } from '@/features/ai-search/lib/responseParser';

export function AISearchResponse({
  content,
  reasoning = '',
  trace = [],
  threads,
  onPreview,
  channels,
  onTokenSelect,
  isStreaming = false,
}: {
  content: string;
  reasoning?: string;
  trace?: AISearchTraceItem[];
  threads: Thread[];
  onPreview: (thread: Thread) => void;
  channels: AISearchMentionChannel[];
  onTokenSelect?: (token: AISearchInlineToken) => void;
  isStreaming?: boolean;
}) {
  const visibleContent = useMemo(() => {
    return isStreaming ? getStreamingSafeContent(content) : content;
  }, [content, isStreaming]);
  const threadMap = useMemo(
    () => new Map(threads.map((thread) => [thread.thread_id, thread])),
    [threads],
  );
  const segments = useMemo(
    () => parseAIResponse(visibleContent, new Set(threadMap.keys())),
    [threadMap, visibleContent],
  );

  return (
    <div className="min-w-0 w-full space-y-4">
      <AISearchReasoning
        content={reasoning}
        trace={trace}
        isStreaming={isStreaming}
        hasAnswer={Boolean(visibleContent.trim())}
      />
      {segments.map((segment, index) => {
        if (segment.type === 'markdown') {
          return (
            <AISearchTokenizedMarkdown
              key={`markdown-${index}`}
              text={segment.content}
              channels={channels}
              onTokenSelect={onTokenSelect}
            />
          );
        }
        const thread = threadMap.get(segment.reference.threadId);
        return thread ? (
          <AISearchThreadReference
            key={`thread-${segment.reference.threadId}-${index}`}
            thread={thread}
            reference={segment.reference}
            onPreview={onPreview}
          />
        ) : null;
      })}
    </div>
  );
}
