import { BookOpen, Palette } from 'lucide-react';

import { ThreadListItem } from '@/entities/thread/ThreadListItem';
import type { Thread } from '@/entities/thread/types';
import type { AIThreadReference } from '@/features/ai-search/lib/responseParser';
import { MASCOT_IMAGES } from '@/features/mascot/assets';

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
    <div className="relative my-6 min-w-0 pb-6">
      <ThreadListItem thread={thread} onPreview={onPreview} animateIn={false} hideBottomDivider />
      <div className="mt-3 space-y-2 pl-1 text-sm leading-6 text-(--od-text-primary)">
        <p className="flex items-start gap-2">
          <img
            src={MASCOT_IMAGES.greeting_window || MASCOT_IMAGES.hi}
            alt=""
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 object-contain"
          />
          <span>{reference.reason}</span>
        </p>
        {reference.overview && (
          <p className="flex items-start gap-2 pl-5 text-xs text-(--od-text-primary)">
            <BookOpen className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span><strong className="font-medium">概览：</strong>{reference.overview}</span>
          </p>
        )}
        {reference.tone && (
          <p className="flex items-start gap-2 pl-5 text-xs text-(--od-text-primary)">
            <Palette className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span><strong className="font-medium">氛围基调：</strong>{reference.tone}</span>
          </p>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--od-divider-strong)_60%,transparent),transparent)]" />
    </div>
  );
}
