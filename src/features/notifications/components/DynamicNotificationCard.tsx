import {
  Bookmark,
  Calendar,
  Clock3,
  Eye,
  MessageCircle,
  MoreHorizontal,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";

import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import type { ViewerFlag } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import type { DynamicNotification } from "@/features/notifications/api/notificationsApi";
import { threadFromNotification } from "@/features/notifications/lib/threadFromNotification";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import { ThreadMoreMenuContent } from "@/features/threads/components/ThreadMoreMenuContent";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import {
  ContextMenu,
  ContextMenuButton,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/shared/ui/ContextMenu";
import { LazyImage } from "@/shared/ui/LazyImage";

interface DynamicNotificationCardProps {
  notification: DynamicNotification;
  onOpen: () => void;
  onAuthorOpen: () => void;
  variant?: "compact" | "feed";
}

function getAuthorName(notification: DynamicNotification) {
  const author = notification.thread.author;
  return (
    author?.display_name ||
    author?.global_name ||
    author?.name ||
    "未知作者"
  );
}

export function DynamicNotificationCard({
  notification,
  onOpen,
  onAuthorOpen,
  variant = "feed",
}: DynamicNotificationCardProps) {
  const compact = variant === "compact";
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const thread = threadFromNotification(notification.thread);
  const isUnread = notification.read_at == null;
  const isNewThread = notification.type === "author_new_thread";
  const actionLabel = isNewThread ? "发布了新作品" : "更新了作品";
  const updateSummary = isNewThread
    ? "这位作者发布了新的作品。"
    : notification.update?.description || "这部作品有新的更新。";
  const excerpt =
    thread.first_message_excerpt ||
    (isNewThread ? "点击查看作品详情。" : updateSummary);
  const thumbnails = thread.thumbnail_urls.slice(0, 4);
  const authorName = getAuthorName(notification);
  const allTags = Array.from(
    new Set([...(thread.tags ?? []), ...(thread.virtual_tags ?? [])]),
  );
  const displayViewerFlags: ViewerFlag[] = (thread.viewer_flags ?? []).filter(
    (flag) => flag !== "unread",
  );
  if (isUnread) displayViewerFlags.push("unread");
  const statItems = [
    { Icon: Eye, value: thread.display_count, label: "浏览" },
    { Icon: MessageCircle, value: thread.reply_count, label: "回复" },
    { Icon: ThumbsUp, value: thread.reaction_count, label: "点赞" },
    { Icon: Bookmark, value: thread.collection_count, label: "收藏" },
  ];

  if (compact) {
    return (
      <article className="relative flex items-start gap-2 rounded-xl border border-(--od-border) bg-(--od-surface-card) p-3 transition-colors hover:bg-(--od-interactive-hover)">
        <button
          type="button"
          onClick={onAuthorOpen}
          className="shrink-0 rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
          aria-label={`前往 ${authorName} 的作者页`}
        >
          <AuthorAvatar author={thread.author} className="h-9 w-9" />
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
          aria-label={`${authorName}${actionLabel}：${thread.title}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isUnread && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--od-accent)"
                aria-label="未读"
              />
            )}
            <span className="truncate text-xs font-medium text-(--od-text-secondary)">
              {authorName}
            </span>
            <span className="shrink-0 text-[11px] text-(--od-text-tertiary)">
              {actionLabel}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-(--od-text-primary)">
            {thread.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-(--od-text-secondary)">
            {updateSummary}
          </p>
          <p className="mt-1.5 text-[11px] text-(--od-text-tertiary)">
            {formatRelativeDateTime(notification.created_at)}
          </p>
        </button>

        <ThreadActions
          threadId={thread.thread_id}
          channelId={thread.channel_id}
          guildId={thread.guild_id}
          size="sm"
          alwaysVisible
          className="shrink-0 [&_a]:h-8 [&_a]:w-8"
        />
      </article>
    );
  }

  return (
    <>
      <article className="border-b border-[color-mix(in_srgb,var(--od-text-secondary)_14%,transparent)] py-5 sm:px-3">
      <header className="mx-auto flex w-full max-w-4xl items-start gap-3">
        <button
          type="button"
          onClick={onAuthorOpen}
          className="shrink-0 rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
          aria-label={`前往 ${authorName} 的作者页`}
        >
          <AuthorAvatar author={thread.author} className="h-11 w-11 sm:h-12 sm:w-12" />
        </button>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={onAuthorOpen}
              aria-label={`前往 ${authorName} 的作者页`}
              className="truncate font-semibold text-(--od-text-primary) transition-colors hover:text-(--od-accent)"
            >
              {authorName}
            </button>
            {isUnread && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--od-accent)"
                aria-label="未读"
              />
            )}
            {!isNewThread && notification.update?.version && (
              <span className="rounded-full bg-(--od-accent)/10 px-2 py-0.5 text-[10px] font-medium text-(--od-accent)">
                {notification.update.version}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-(--od-text-tertiary)">
            {formatRelativeDateTime(notification.created_at)} · {actionLabel}
          </p>
          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-(--od-text-secondary)">
            {updateSummary}
          </p>
        </div>
      </header>

        <ContextMenu>
          <div className="relative mx-auto mt-4 w-full max-w-4xl sm:pl-[3.75rem]">
            <ContextMenuTrigger className="w-full">
              <button
                type="button"
                onClick={onOpen}
                className="group flex w-full min-w-0 items-stretch gap-3 rounded-xl p-2 text-left transition-colors hover:bg-(--od-interactive-hover) focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) sm:gap-5 sm:p-3"
                aria-label={`${authorName}${actionLabel}：${thread.title}`}
              >
          {thumbnails.length > 0 && (
            <div
              className={`grid h-28 w-24 shrink-0 gap-1 overflow-hidden rounded-xl bg-(--od-surface-soft) sm:h-40 sm:w-52 sm:rounded-2xl ${
                thumbnails.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-2 grid-rows-2"
              }`}
            >
              {thumbnails.map((src, index) => (
                <div
                  key={src}
                  className={`relative min-h-0 overflow-hidden ${
                    thumbnails.length === 2 ? "row-span-2" : ""
                  } ${thumbnails.length === 3 && index === 0 ? "row-span-2" : ""}`}
                >
                  <LazyImage
                    src={src}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {index === thumbnails.length - 1 &&
                    thread.thumbnail_urls.length > thumbnails.length && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] text-white backdrop-blur-sm">
                        +{thread.thumbnail_urls.length - thumbnails.length}
                      </span>
                    )}
                </div>
              ))}
            </div>
          )}

          <div className="flex min-h-28 min-w-0 flex-1 flex-col pb-9 pr-12 sm:min-h-40 sm:pr-14">
            <div className="flex min-w-0 items-start gap-2">
              <h3 className="line-clamp-2 min-w-0 flex-1 text-base font-bold leading-6 text-(--od-text-primary) sm:text-lg">
                {thread.title}
              </h3>
            </div>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-(--od-text-secondary) sm:line-clamp-3">
              {excerpt}
            </p>

            {allTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {allTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-(--od-surface-raised)/70 px-2 py-0.5 text-[10px] text-(--od-text-secondary)"
                  >
                    #{tag}
                  </span>
                ))}
                {allTags.length > 5 && (
                  <span className="px-1 text-[10px] text-(--od-text-tertiary)">
                    +{allTags.length - 5}
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-(--od-text-tertiary)">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatRelativeDateTime(thread.created_at)}
              </span>
              {thread.last_active_at && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  活跃 {formatRelativeDateTime(thread.last_active_at)}
                </span>
              )}
              <ThreadTournamentBadges thread={thread} variant="inline" />
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pr-20 pt-3 text-(--od-text-tertiary)">
              {statItems.map(({ Icon, value, label }) => (
                <span
                  key={label}
                  className="inline-flex min-w-0 items-center gap-1 text-[11px]"
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate tabular-nums">{value}</span>
                </span>
              ))}
            </div>
          </div>
              </button>
            </ContextMenuTrigger>

            <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
              <ThreadStatusBadges
                viewerFlags={displayViewerFlags}
                variant="card"
              />
            </div>

            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 text-(--od-text-tertiary) sm:bottom-3 sm:right-3">
              <ContextMenuButton
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                aria-label="更多作品操作"
                title="更多操作"
              >
                <MoreHorizontal className="h-4 w-4" />
              </ContextMenuButton>
              <ThreadActions
                threadId={thread.thread_id}
                channelId={thread.channel_id}
                guildId={thread.guild_id}
                size="md"
                alwaysVisible
                className="[&_a]:h-8 [&_a]:w-8"
              />
            </div>
          </div>

          <ContextMenuContent>
            <ThreadMoreMenuContent
              thread={thread}
              onAddToBooklist={() => setQuickAddOpen(true)}
            />
          </ContextMenuContent>
        </ContextMenu>
      </article>

      <QuickAddToBooklistModal
        isOpen={quickAddOpen}
        threadId={thread.thread_id}
        threadTitle={thread.title}
        onClose={() => setQuickAddOpen(false)}
      />
    </>
  );
}
