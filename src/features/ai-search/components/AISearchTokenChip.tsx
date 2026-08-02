import { MessageCircle, Tag, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { Author } from '@/entities/thread/types';
import { AuthorWorksHoverCard } from '@/features/authors/components/AuthorWorksHoverCard';
import { useAuthorProfiles } from '@/features/authors/hooks/useAuthorProfiles';
import type { AISearchMentionChannel } from '@/features/ai-search/components/AISearchTokenInput';
import type { AISearchInlineToken } from '@/features/ai-search/lib/inlineTokens';
import { LazyImage } from '@/shared/ui/LazyImage';

export function AISearchTokenChip({
  token,
  channels,
  onRemove,
  onSelect,
}: {
  token: AISearchInlineToken;
  channels: AISearchMentionChannel[];
  onRemove?: () => void;
  onSelect?: (token: AISearchInlineToken) => void;
}) {
  const navigate = useNavigate();
  const profiles = useAuthorProfiles(token.type === 'author' ? [token.value] : []);
  const profile = profiles[token.value];
  const channel = token.type === 'channel' ? channels.find((item) => item.id === token.value) : null;
  const label = profile?.display_name || profile?.name || channel?.name || token.value;
  const color = token.type === 'author'
    ? 'border-violet-500/40 bg-violet-500/12 text-violet-300'
    : token.type === 'channel'
      ? 'border-amber-500/40 bg-amber-500/12 text-amber-300'
      : 'border-sky-500/40 bg-sky-500/12 text-sky-300';
  const author: Author | null = token.type === 'author' ? {
    id: token.value,
    name: profile?.name || token.value,
    global_name: profile?.global_name || null,
    display_name: profile?.display_name || profile?.name || token.value,
    avatar_url: profile?.avatar_url || null,
  } : null;

  const content = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (token.type === 'author') navigate(`/u/${token.value}`);
        else onSelect?.(token);
      }}
      className="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-white focus-visible:outline-hidden focus-visible:text-white"
      aria-label={token.type === 'author' ? `查看作者 ${label}` : `使用 ${label}`}
    >
      {token.type === 'author' && profile?.avatar_url ? (
        <LazyImage src={profile.avatar_url} alt={label} className="h-4 w-4 rounded-full object-cover" />
      ) : token.type === 'author' ? (
        <User className="h-3 w-3" />
      ) : token.type === 'channel' ? (
        <MessageCircle className="h-3 w-3" />
      ) : (
        <Tag className="h-3 w-3" />
      )}
      <span className="min-w-0 max-w-40 truncate">{label}</span>
    </button>
  );

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 align-middle text-xs font-medium ${color}`}>
      {author ? <AuthorWorksHoverCard author={author}>{content}</AuthorWorksHoverCard> : content}
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`移除 ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
