import { Image as ImageIcon, ThumbsUp } from "lucide-react";

import type { Thread } from "@/entities/thread/types";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { LazyImage } from "@/shared/ui/LazyImage";

function getAuthorName(thread: Thread) {
  return (
    thread.author?.display_name ||
    thread.author?.global_name ||
    thread.author?.name ||
    "未知作者"
  );
}

interface CompactThreadCardProps {
  thread: Thread;
  onOpen: (thread: Thread) => void;
}

export function CompactThreadCardSkeleton() {
  return (
    <article aria-hidden="true" className="min-w-0 animate-pulse">
      <div className="aspect-square rounded-xl bg-(--od-surface-input)" />
      <div className="mt-2 h-8 rounded-md bg-(--od-surface-input)" />
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="h-4.5 w-4.5 shrink-0 rounded-full bg-(--od-surface-input)" />
        <div className="h-2.5 w-16 rounded bg-(--od-surface-input)" />
      </div>
    </article>
  );
}

export function CompactThreadCard({ thread, onOpen }: CompactThreadCardProps) {
  const thumbnail = thread.thumbnail_urls?.[0];
  const authorName = getAuthorName(thread);

  return (
    <article className="min-w-0">
      <button
        type="button"
        onClick={() => onOpen(thread)}
        aria-label={`预览帖子：${thread.title}，作者：${authorName}`}
        className="group block w-full min-w-0 text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
      >
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-(--od-surface-shell)">
          {thumbnail ? (
            <LazyImage
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
              threadId={thread.thread_id}
              channelId={thread.channel_id}
              imageIndex={0}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-(--od-surface-shell)">
              <ImageIcon className="h-5 w-5 text-(--od-text-tertiary)" />
            </span>
          )}
          <span
            className={`absolute left-2 top-2 inline-flex items-center gap-1 text-[10px] font-medium ${
              thumbnail
                ? "text-white drop-shadow-[0_1px_3px_rgb(0_0_0_/_0.9)]"
                : "text-(--od-text-tertiary)"
            }`}
          >
            <ThumbsUp className="h-3 w-3" />
            {thread.reaction_count}
          </span>
        </span>

        <span className="mt-2 block min-w-0">
          <span className="line-clamp-2 h-8 text-xs font-semibold leading-4 text-(--od-text-primary) transition-colors group-hover:text-(--od-text-heading)">
            {thread.title}
          </span>
        </span>
      </button>
      <AuthorIdentityLink
        author={thread.author}
        currentThreadId={thread.thread_id}
        avatarClassName="h-4.5 w-4.5"
        nameClassName="text-[10px]"
        className="mt-1.5 max-w-full"
      />
    </article>
  );
}
