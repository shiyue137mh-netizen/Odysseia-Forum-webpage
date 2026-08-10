import { AISearchTokenChip } from '@/features/ai-search/components/AISearchTokenChip';
import type { AISearchMentionChannel } from '@/features/ai-search/components/AISearchTokenInput';
import { parseAISearchInlineTokens, type AISearchInlineToken } from '@/features/ai-search/lib/inlineTokens';
import { MarkdownText } from '@/shared/ui/MarkdownText';

export function AISearchTokenizedMarkdown({
  text,
  channels,
  onTokenSelect,
}: {
  text: string;
  channels: AISearchMentionChannel[];
  onTokenSelect?: (token: AISearchInlineToken) => void;
}) {
  const segments = parseAISearchInlineTokens(text);
  return (
    <div className="min-w-0 max-w-full text-base leading-8 text-(--od-text-primary)">
      {segments.map((segment, index) => segment.type === 'markdown' ? (
        <MarkdownText
          key={`markdown-${index}`}
          text={segment.content}
          className="text-base! leading-8 text-(--od-text-primary)! sm:text-base!"
          enableTables
          inline
        />
      ) : (
        <AISearchTokenChip
          key={`token-${segment.token.type}-${segment.token.value}-${index}`}
          token={segment.token}
          channels={channels}
          onSelect={onTokenSelect}
        />
      ))}
    </div>
  );
}
