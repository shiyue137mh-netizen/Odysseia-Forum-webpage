import { Clock3, Images, BookOpen } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import { LazyImage } from "@/shared/ui/LazyImage";
import { HighlightText } from "@/shared/ui/HighlightText";
import { MarkdownText } from "@/shared/ui/MarkdownText";
import type { Thread } from "@/entities/thread/types";
import { useImageModeSetting } from "@/shared/hooks/useSettings";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { ThreadBooklistComment } from "@/entities/thread/ThreadBooklistComment";
import { ThreadStatsRow } from "@/entities/thread/ThreadStatsRow";
import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTagList } from "@/features/threads/components/ThreadTagList";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import { useThreadCardModel } from "@/entities/thread/useThreadCardModel";
import { usePretextClampText } from "@/shared/hooks/usePretextClampText";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import { subscribeThreadThumbnailRepair } from "@/features/threads/lib/thumbnailRepairQueue";

interface ThreadListItemProps {
  thread: Thread;
  onTagClick?: (tag: string) => void;
  searchQuery?: string;
  onAuthorClick?: (author: { id: string; name: string }) => void;
  onPreview?: (thread: Thread) => void;
  booklistComment?: string | null;
  index?: number;
  animateIn?: boolean;
  resultPage?: number;
  hideBottomDivider?: boolean;
  renderSecondaryImages?: boolean;
}

function ThreadListItemImpl({
  thread,
  onTagClick,
  searchQuery,
  onAuthorClick,
  onPreview,
  booklistComment,
  index = 0,
  animateIn = true,
  resultPage,
  hideBottomDivider = false,
  renderSecondaryImages = true,
}: ThreadListItemProps) {
  const {
    fontSizes,
    quickAddOpen,
    setQuickAddOpen,
    createdTime,
    lastActiveTime,
    virtualOnlyTags,
    hasExcerpt,
    animationDelay,
  } = useThreadCardModel(thread, index);
  const imageMode = useImageModeSetting();

  const initialThumbnailUrls = useMemo(
    () => (imageMode === "off" ? [] : thread.thumbnail_urls || []),
    [imageMode, thread.thumbnail_urls],
  );
  const [repairedThumbnailState, setRepairedThumbnailState] = useState<{
    threadId: string;
    urls: string[];
  } | null>(null);
  const thumbnailUrls =
    repairedThumbnailState?.threadId === thread.thread_id
      ? repairedThumbnailState.urls
      : initialThumbnailUrls;

  useEffect(() => {
    if (imageMode === "off") return;
    return subscribeThreadThumbnailRepair(thread.thread_id, (urls) => {
      setRepairedThumbnailState({ threadId: thread.thread_id, urls });
    });
  }, [imageMode, thread.thread_id]);

  // 获取有效的去重缩略图列表，最多 4 张
  const thumbnails = useMemo(() => {
    const urls = thumbnailUrls.filter(Boolean);
    return Array.from(new Set(urls)).slice(0, 4);
  }, [thumbnailUrls]);

  const { measureRef: titleMeasureRef, clampedText: clampedTitle } =
    usePretextClampText<HTMLHeadingElement>(thread.title, { maxLines: 2 });

  // 缓存命中直出的页面传 animateIn=false：内容用户已看过，不再重播浮现动画。
  const entranceClass = animateIn
    ? " animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both"
    : "";

  return (
    <article
      data-result-page={resultPage}
      className={`group relative w-full cursor-pointer py-3 text-(--od-text-primary) [content-visibility:auto] [contain-intrinsic-size:auto_200px] transition-colors duration-200${entranceClass}`}
      style={animateIn ? { animationDelay } : undefined}
      onClick={() => onPreview?.(thread)}
    >
      {!hideBottomDivider && (
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--od-divider-strong)_60%,transparent),transparent)]" />
      )}

      <div className="flex items-start gap-3 md:gap-5">
        <div className="w-16 shrink-0 md:w-54 lg:w-58">
          {thumbnails.length > 0 ? (
            <div className="grid h-20 grid-cols-1 gap-1.5 md:h-43 md:grid-cols-2">
              {thumbnails.length === 1 && (
                <div className="relative col-span-1 overflow-hidden rounded-xl bg-(--od-surface-shell) md:col-span-2 md:rounded-2xl">
                  <LazyImage
                    src={thumbnails[0]}
                    alt={`${thread.title} 缩略图 1`}
                    className="h-full w-full object-cover"
                    threadId={thread.thread_id}
                    channelId={thread.channel_id}
                    imageIndex={0}
                    subscribeToRecovery={false}
                  />
                </div>
              )}

              {thumbnails.length === 2 && (
                <>
                  {/* 移动端只展示第一张 */}
                  <div className="relative overflow-hidden rounded-xl bg-(--od-surface-shell) md:rounded-2xl">
                    <LazyImage
                      src={thumbnails[0]}
                      alt={`${thread.title} 缩略图 1`}
                      className="h-full w-full object-cover"
                      threadId={thread.thread_id}
                      channelId={thread.channel_id}
                      imageIndex={0}
                      subscribeToRecovery={false}
                    />
                  </div>
                  {renderSecondaryImages && (
                    <div className="relative hidden overflow-hidden rounded-2xl bg-(--od-surface-shell) md:block">
                      <LazyImage
                        src={thumbnails[1]}
                        alt={`${thread.title} 缩略图 2`}
                        className="h-full w-full object-cover"
                        threadId={thread.thread_id}
                        channelId={thread.channel_id}
                        index={index}
                        imageIndex={1}
                        subscribeToRecovery={false}
                      />
                    </div>
                  )}
                </>
              )}

              {thumbnails.length === 3 && (
                <>
                  <div className="relative overflow-hidden rounded-xl bg-(--od-surface-shell) md:row-span-2 md:rounded-2xl">
                    <LazyImage
                      src={thumbnails[0]}
                      alt={`${thread.title} 缩略图 1`}
                      className="h-full w-full object-cover"
                      threadId={thread.thread_id}
                      channelId={thread.channel_id}
                      imageIndex={0}
                      subscribeToRecovery={false}
                    />
                  </div>
                  {renderSecondaryImages && (
                    <>
                      <div className="relative hidden overflow-hidden rounded-2xl bg-(--od-surface-shell) md:block">
                        <LazyImage
                          src={thumbnails[1]}
                          alt={`${thread.title} 缩略图 2`}
                          className="h-full w-full object-cover"
                          threadId={thread.thread_id}
                          channelId={thread.channel_id}
                          index={index}
                          imageIndex={1}
                          subscribeToRecovery={false}
                        />
                      </div>
                      <div className="relative hidden overflow-hidden rounded-2xl bg-(--od-surface-shell) md:block">
                        <LazyImage
                          src={thumbnails[2]}
                          alt={`${thread.title} 缩略图 3`}
                          className="h-full w-full object-cover"
                          threadId={thread.thread_id}
                          channelId={thread.channel_id}
                          imageIndex={2}
                          subscribeToRecovery={false}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {thumbnails.length === 4 && (
                <>
                  {/* 移动端只展示第一张 */}
                  <div className="relative overflow-hidden rounded-xl bg-(--od-surface-shell) md:rounded-2xl">
                    <LazyImage
                      src={thumbnails[0]}
                      alt={`${thread.title} 缩略图 1`}
                      className="h-full w-full object-cover"
                      threadId={thread.thread_id}
                      channelId={thread.channel_id}
                      imageIndex={0}
                      subscribeToRecovery={false}
                    />
                  </div>
                  {renderSecondaryImages &&
                    thumbnails.slice(1).map((src, idx) => (
                      <div
                        key={`${thread.thread_id}-${src}-${idx + 1}`}
                        className="relative hidden overflow-hidden rounded-2xl bg-(--od-surface-shell) md:block"
                      >
                        <LazyImage
                          src={src}
                          alt={`${thread.title} 缩略图 ${idx + 2}`}
                          className="h-full w-full object-cover"
                          threadId={thread.thread_id}
                          channelId={thread.channel_id}
                          index={index}
                          imageIndex={idx + 1}
                          subscribeToRecovery={false}
                        />
                        {idx === 2 &&
                          (thread.thumbnail_urls?.length || 0) >
                            thumbnails.length && (
                            <div className="absolute inset-0 flex items-end justify-end bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.42))] p-2 text-white">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-[0.08em]">
                                <Images className="h-3 w-3" />+
                                {(thread.thumbnail_urls?.length || 0) -
                                  thumbnails.length}
                              </span>
                            </div>
                          )}
                      </div>
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-xl bg-(--od-surface-shell) md:h-43 md:rounded-2xl">
              <Images className="h-5 w-5 text-(--od-text-tertiary) opacity-40 md:h-7 md:w-7" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col md:min-h-43">
          <div
            className={`mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${fontSizes.meta} text-(--od-text-tertiary)`}
          >
            <AuthorIdentityLink
              author={thread.author}
              currentThreadId={thread.thread_id}
              avatarClassName="h-6 w-6 md:h-7 md:w-7"
              nameClassName="max-w-36 font-medium text-(--od-text-secondary)"
              onNavigate={onAuthorClick}
            />
            <span className="text-(--od-divider-strong)/75">/</span>
            <span className="whitespace-nowrap">{createdTime}</span>
            {lastActiveTime && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Clock3 className="h-3 w-3" />
                活跃 {lastActiveTime}
              </span>
            )}
            <ThreadTournamentBadges thread={thread} variant="inline" />
          </div>

          <button
            type="button"
            className="mb-3 flex items-start gap-2.5 text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
            aria-label={`预览帖子：${thread.title}`}
          >
            <h3
              ref={titleMeasureRef}
              className={`min-w-0 flex-1 font-semibold leading-snug tracking-[-0.02em] text-(--od-text-primary) transition-colors duration-200 group-hover:text-(--od-accent) ${fontSizes.title}`}
            >
              <HighlightText text={clampedTitle} highlight={searchQuery} />
            </h3>
          </button>

          {hasExcerpt && (
            <div
              className={`mb-3 od-md line-clamp-2 break-all leading-relaxed text-(--od-text-secondary) md:max-w-[72ch] ${fontSizes.content}`}
            >
              <MarkdownText text={thread.first_message_excerpt!} />
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2.5">
            <ThreadTagList
              thread={thread}
              virtualOnlyTags={virtualOnlyTags}
              onTagClick={onTagClick}
              variant="list"
            />

            <ThreadBooklistComment comment={booklistComment} variant="list" />

            <div className="flex items-center gap-4">
              <ThreadStatsRow thread={thread} variant="list" />

              <div className="ml-auto flex items-center gap-2 text-(--od-text-tertiary) transition-colors group-hover:text-(--od-text-primary) md:hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickAddOpen(true);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-(--od-bg-tertiary) hover:text-(--od-text-primary)"
                  aria-label="加入书单"
                  title="加入书单"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <ThreadActions
                  threadId={thread.thread_id}
                  channelId={thread.channel_id}
                  guildId={thread.guild_id}
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-3 flex items-center gap-3">
        <ThreadStatusBadges
          isFollowing={thread.collected_flag}
          hasUpdate={thread.has_update}
          variant="list"
        />
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuickAddOpen(true);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-(--od-text-tertiary) transition-all duration-200 md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 hover:bg-(--od-bg-tertiary) hover:text-(--od-text-primary)"
            aria-label="加入书单"
            title="加入书单"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <div className="text-(--od-text-tertiary) transition-colors group-hover:text-(--od-text-primary)">
            <ThreadActions
              threadId={thread.thread_id}
              channelId={thread.channel_id}
              guildId={thread.guild_id}
              size="md"
            />
          </div>
        </div>
      </div>

      <QuickAddToBooklistModal
        isOpen={quickAddOpen}
        threadId={thread.thread_id}
        threadTitle={thread.title}
        onClose={() => setQuickAddOpen(false)}
      />
    </article>
  );
}

export const ThreadListItem = memo(ThreadListItemImpl);
