import {
  BookOpen,
  Calendar,
  Clock3,
  Eye,
  Image as ImageIcon,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import { ThreadAchievementTag } from "@/entities/thread/ThreadAchievementTag";
import type { Thread } from "@/entities/thread/types";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import { subscribeThreadThumbnailRepair } from "@/features/threads/lib/thumbnailRepairQueue";
import {
  useCardSizeSetting,
  useFontSizeSetting,
} from "@/shared/hooks/useSettings";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import { fontSizeMap } from "@/shared/lib/settings";
import { DiscordMarkdownText } from "@/shared/ui/DiscordMarkdownText";
import { HighlightText } from "@/shared/ui/HighlightText";
import { LazyImage } from "@/shared/ui/LazyImage";

interface ThreadCardProps {
  thread: Thread;
  onTagClick?: (tag: string) => void;
  searchQuery?: string;
  onAuthorClick?: (author: { id: string; name: string }) => void;
  onPreview?: (thread: Thread) => void;
  booklistComment?: string | null;
  index?: number;
  hideBottomDivider?: boolean;
  masonry?: boolean;
}

const thumbnailAspectRatioCache = new Map<string, number>();

function ThreadCardImpl({
  thread,
  onTagClick,
  searchQuery,
  onAuthorClick,
  onPreview,
  booklistComment,
  index = 0,
  hideBottomDivider = false,
  masonry = false,
}: ThreadCardProps) {
  const ariaLabel = `帖子：${thread.title}。作者：${thread.author?.display_name || thread.author?.name || "未知"}。${thread.reply_count}条回复，${thread.reaction_count}个点赞。标签：${thread.tags.join(", ")}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPreview?.(thread);
    }
  };
  const fontSize = useFontSizeSetting();
  const fontSizes = fontSizeMap[fontSize];
  const cardSize = useCardSizeSetting();

  const initialThumbnail = useMemo(
    () => thread.thumbnail_urls?.[0] || "",
    [thread.thumbnail_urls],
  );
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(
    () => thumbnailAspectRatioCache.get(initialThumbnail) || null,
  );
  const titleViewportRef = useRef<HTMLSpanElement>(null);
  const titleTrackRef = useRef<HTMLSpanElement>(null);
  const [titleShift, setTitleShift] = useState(0);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const shouldMarquee = isTitleHovered && titleShift > 0;

  useEffect(() => {
    setThumbnailSrc(initialThumbnail);
    setNaturalAspectRatio(
      thumbnailAspectRatioCache.get(initialThumbnail) || null,
    );
  }, [initialThumbnail, thread.thread_id]);

  useEffect(() => {
    return subscribeThreadThumbnailRepair(thread.thread_id, (urls) => {
      if (urls.length > 0) setThumbnailSrc(urls[0]);
    });
  }, [thread.thread_id]);

  useEffect(() => {
    const updateTitleShift = () => {
      const viewportWidth = titleViewportRef.current?.clientWidth || 0;
      const trackWidth = titleTrackRef.current?.scrollWidth || 0;
      setTitleShift(Math.max(trackWidth - viewportWidth + 12, 0));
    };

    updateTitleShift();
    window.addEventListener("resize", updateTitleShift);
    return () => window.removeEventListener("resize", updateTitleShift);
  }, [thread.title, fontSize, searchQuery]);

  const createdTime = formatRelativeDateTime(thread.created_at);
  const lastActiveTime = thread.last_active_at
    ? formatRelativeDateTime(thread.last_active_at)
    : null;
  const virtualOnlyTags = (thread.virtual_tags || []).filter(
    (tag) => !thread.tags.includes(tag),
  );
  const hasExcerpt =
    !!thread.first_message_excerpt &&
    thread.first_message_excerpt.trim() !== "...";

  const mediaAspectClass =
    cardSize === "compact"
      ? "aspect-3/4"
      : cardSize === "large"
        ? "aspect-5/7"
        : "aspect-3/4";

  return (
    <>
      <article
        role="button"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`group flex w-full cursor-pointer flex-col rounded-[1.45rem] animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) ${masonry ? "h-auto" : "h-full"}`}
        style={{
          animationDelay: `${(index % 24) * 40}ms`,
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest("button, a"))
            e.preventDefault();
        }}
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
        onClick={() => onPreview?.(thread)}
      >
        {/* 拦截 Tab 焦点进入内部元素，并对辅助技术隐藏内部细节 */}
        <div
          aria-hidden="true"
          className={`flex w-full flex-col pointer-events-auto ${masonry ? "h-auto" : "h-full"}`}
          ref={(el) => {
            if (el) {
              const focusables = el.querySelectorAll(
                'a, button, [tabindex="0"]',
              );
              focusables.forEach((node) => {
                node.setAttribute("tabindex", "-1");
              });
            }
          }}
        >
          <div className="flex flex-col gap-2 px-1 pb-3 pt-1 text-(--od-text-primary)">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <AuthorIdentityLink
                author={thread.author}
                currentThreadId={thread.thread_id}
                showName={false}
                avatarClassName="h-6 w-6 md:h-7 md:w-7"
                onNavigate={onAuthorClick}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex h-4 min-w-0 items-center gap-1">
                  <AuthorIdentityLink
                    author={thread.author}
                    currentThreadId={thread.thread_id}
                    showAvatar={false}
                    nameClassName="max-w-[140px] text-xs font-medium leading-4 text-(--od-text-secondary)"
                    onNavigate={onAuthorClick}
                  />
                  <ThreadTournamentBadges thread={thread} variant="icon" />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-(--od-text-tertiary)">
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>{createdTime}</span>
                  </span>
                  {lastActiveTime && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Clock3 className="h-3 w-3 shrink-0" />
                      <span>活跃 {lastActiveTime}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center self-start pt-1">
                <ThreadStatusBadges
                  isFollowing={thread.collected_flag}
                  hasUpdate={thread.has_update}
                  variant="card"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              <h3
                className={`whitespace-nowrap ${fontSizes.title} text-(--od-text-primary) transition-colors duration-200 group-hover:text-(--od-accent)`}
              >
                <span
                  ref={titleViewportRef}
                  className="inline-block max-w-full overflow-hidden align-top"
                >
                  <span
                    ref={titleTrackRef}
                    style={{
                      ["--od-marquee-distance" as string]: `${titleShift}px`,
                      ["--od-marquee-gap" as string]: "1.75rem",
                      ["--od-marquee-duration" as string]: `${Math.max(5, titleShift / 22)}s`,
                    }}
                    className={`od-marquee-track inline-flex items-center font-extrabold leading-snug tracking-[-0.02em] ${
                      shouldMarquee ? "od-marquee-active" : ""
                    }`}
                  >
                    <span className="shrink-0">
                      <HighlightText
                        text={thread.title}
                        highlight={searchQuery}
                      />
                    </span>
                    {titleShift > 0 && (
                      <>
                        <span className="mx-7 shrink-0 text-(--od-text-tertiary)/55">
                          /
                        </span>
                        <span className="shrink-0">
                          <HighlightText
                            text={thread.title}
                            highlight={searchQuery}
                          />
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </h3>
            </div>
          </div>

          <div
            className={`relative w-full overflow-hidden rounded-[1.45rem] border border-(--od-shell-line) bg-(--od-surface-shell) shadow-(--od-shadow-soft) ${mediaAspectClass}`}
            style={
              masonry ? { aspectRatio: naturalAspectRatio || 3 / 4 } : undefined
            }
          >
            {thumbnailSrc ? (
              <LazyImage
                src={thumbnailSrc}
                alt={thread.title}
                className="h-full w-full"
                threadId={thread.thread_id}
                channelId={thread.channel_id}
                index={index}
                onNaturalSize={(width, height) => {
                  if (!masonry || width <= 0 || height <= 0) return;
                  // ponytail: 限制极端长图比例以避免单张图片占据整列；需要完整长图时可改为展开查看。
                  const ratio = Math.min(1.5, Math.max(0.58, width / height));
                  thumbnailAspectRatioCache.set(thumbnailSrc, ratio);
                  setNaturalAspectRatio(ratio);
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_srgb,var(--od-surface-raised)_15%,transparent)]">
                <ImageIcon className="h-12 w-12 text-(--od-text-tertiary)/20" />
              </div>
            )}

            <div className="absolute right-3 top-3 z-20 flex items-center gap-2 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickAddOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                aria-label="加入书单"
                title="加入书单"
              >
                <BookOpen className="h-4 w-4" />
              </button>
              <ThreadActions
                threadId={thread.thread_id}
                channelId={thread.channel_id}
                guildId={thread.guild_id}
                variant="glass"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-1 pt-3 text-(--od-text-primary)">
            <div className="min-h-11">
              {hasExcerpt && (
                <p
                  className={`${fontSizes.content} line-clamp-2 leading-relaxed text-(--od-text-secondary) transition-colors duration-200 group-hover:text-[color-mix(in_srgb,var(--od-text-secondary)_72%,var(--od-text-primary))]`}
                >
                  <DiscordMarkdownText
                    text={thread.first_message_excerpt || ""}
                  />
                </p>
              )}
            </div>

            <div className="min-h-11 content-start">
              {(thread.reaction_count >= 100 || thread.tags.length > 0 || virtualOnlyTags.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  <ThreadAchievementTag reactionCount={thread.reaction_count} variant="card" />
                  {thread.tags.slice(0, 3).map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick?.(tag);
                      }}
                      className="rounded-md border border-(--od-border)/30 bg-(--od-surface-raised)/60 px-2 py-0.5 text-[10px] text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-raised) hover:text-(--od-text-primary)"
                    >
                      {tag}
                    </button>
                  ))}
                  {thread.tags.length > 3 && (
                    <span className="rounded-md border border-(--od-border)/30 bg-(--od-surface-raised)/60 px-2 py-0.5 text-[10px] text-(--od-text-secondary)">
                      +{thread.tags.length - 3}
                    </span>
                  )}
                  {virtualOnlyTags.slice(0, 2).map((tag) => (
                    <span
                      key={`vt-${tag}`}
                      className="rounded-md border border-cyan-200/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-500"
                    >
                      ~{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {booklistComment !== undefined && (
              <p className="min-h-12 line-clamp-2 text-xs leading-6 text-(--od-text-secondary)">
                {booklistComment ? (
                  <>
                    <span className="font-medium text-(--od-accent)">
                      推荐语
                    </span>
                    <span className="mx-1 text-(--od-text-tertiary)">/</span>
                    {booklistComment}
                  </>
                ) : (
                  "\u00a0"
                )}
              </p>
            )}

            <div className="mt-auto grid grid-cols-3 gap-2 text-(--od-text-tertiary)">
              <span
                className="inline-flex min-w-0 items-center gap-1 text-[11px]"
                title="浏览量"
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate text-[clamp(9px,1.8vw,11px)] font-medium tabular-nums">
                  {thread.display_count}
                </span>
              </span>
              <span
                className="inline-flex min-w-0 items-center gap-1 text-[11px]"
                title="回复数"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate text-[clamp(9px,1.8vw,11px)] font-medium tabular-nums">
                  {thread.reply_count}
                </span>
              </span>
              <span
                className="inline-flex min-w-0 items-center gap-1 text-[11px]"
                title="点赞数"
              >
                <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate text-[clamp(9px,1.8vw,11px)] font-medium tabular-nums">
                  {thread.reaction_count}
                </span>
              </span>
            </div>

            {!hideBottomDivider && (
              <div className="h-px w-full bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--od-border-strong)_36%,transparent),transparent)]" />
            )}
          </div>
        </div>
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

export const ThreadCard = memo(ThreadCardImpl);
