import type { Thread } from '@/entities/thread/types';
import {
  CompactThreadCard,
  CompactThreadCardSkeleton,
} from '@/features/threads/components/CompactThreadCard';

interface DailyNewCardsProps {
  threads: Thread[];
  loading: boolean;
  onOpen: (thread: Thread) => void;
}

export function DailyNewCards({ threads, loading, onOpen }: DailyNewCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <CompactThreadCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return <p className="py-8 text-sm text-(--od-text-tertiary)">今天暂时没有新卡。</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {threads.slice(0, 8).map((thread) => (
        <CompactThreadCard key={thread.thread_id} thread={thread} onOpen={onOpen} />
      ))}
    </div>
  );
}
