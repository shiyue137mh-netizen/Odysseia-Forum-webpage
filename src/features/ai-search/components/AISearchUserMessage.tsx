import { useMemo } from 'react';

import type { AISearchMentionChannel } from '@/features/ai-search/components/AISearchTokenInput';
import { AISearchTokenChip } from '@/features/ai-search/components/AISearchTokenChip';
import { parseSearchQuery } from '@/shared/lib/searchTokenizer';

export function AISearchUserMessage({
  content,
  channels,
}: {
  content: string;
  channels: AISearchMentionChannel[];
}) {
  const tokens = useMemo(() => parseSearchQuery(content), [content]);
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {tokens.map((token, index) => {
        if (token.type === 'text') {
          return <p key={`text-${index}`} className="w-full whitespace-pre-wrap text-base leading-8 text-(--od-text-secondary)">{token.value}</p>;
        }
        return token.type === 'tag' || token.type === 'author' || token.type === 'channel' ? (
          <AISearchTokenChip
            key={`${token.type}-${token.value}-${index}`}
            token={{ type: token.type, value: token.value }}
            channels={channels}
          />
        ) : (
          <span key={`${token.type}-${token.value}-${index}`} className="text-xs text-(--od-text-tertiary)">
            {token.value}
          </span>
        );
      })}
    </div>
  );
}
