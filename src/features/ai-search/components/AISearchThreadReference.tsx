import { BookOpen, Palette, Sparkles } from 'lucide-react';

import { ThreadListItem } from '@/entities/thread/ThreadListItem';
import type { Thread } from '@/entities/thread/types';
import type { AIThreadReference } from '@/features/ai-search/lib/responseParser';

export function AISearchThreadReference({
  thread,
  reference,
  onPreview,
}: {
  thread: Thread;
  reference: AIThreadReference;
  onPreview: (thread: Thread) => void;
}) {
  return (
    <div className="my-6 min-w-0">
      <ThreadListItem thread={thread} onPreview={onPreview} animateIn={false} />
      <div className="mt-3 space-y-2 pl-1 text-sm leading-6 text-(--od-text-secondary)">
        <p className="flex items-start gap-2">
          <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-(--od-accent)" />
          <span>{reference.reason}</span>
        </p>
        {reference.overview && (
          <p className="flex items-start gap-2 pl-5 text-xs text-(--od-text-tertiary)">
            <BookOpen className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span><strong className="font-medium text-(--od-text-secondary)">概览：</strong>{reference.overview}</span>
          </p>
        )}
        {reference.tone && (
          <p className="flex items-start gap-2 pl-5 text-xs text-(--od-text-tertiary)">
            <Palette className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span><strong className="font-medium text-(--od-text-secondary)">氛围基调：</strong>{reference.tone}</span>
          </p>
        )}
      </div>
    </div>
  );
}
