import { BookOpen, Calendar, Clock3, Image as ImageIcon } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { ThreadBooklistComment } from "@/entities/thread/ThreadBooklistComment";
import { ThreadStatsRow } from "@/entities/thread/ThreadStatsRow";
import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTagList } from "@/entities/thread/ThreadTagList";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import type { Thread } from "@/entities/thread/types";
import { useThreadCardModel } from "@/entities/thread/useThreadCardModel";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import { subscribeThreadThumbnailRepair } from "@/features/threads/lib/thumbnailRepairQueue";
import { useImageModeSetting } from "@/shared/hooks/useSettings";
import { DiscordMarkdownText } from "@/shared/ui/DiscordMarkdownText";
import { HighlightText } from "@/shared/ui/HighlightText";
import { LazyImage } from "@/shared/ui/LazyImage";
import { BannerFadeMedia } from "@/shared/ui/BannerFadeMedia";

interface ThreadCardProps {
  thread: Thread;
  onTagClick?: (tag: string) => void;
  searchQuery?: string;
  onAuthorClick?: (author: { id: string; name: string }) => void;
  onPreview?: (thread: Thread) => void;
  booklistComment?: string | null;
  index?: number;
  masonry?: boolean;
  animateIn?: boolean;
  resultPage?: number;
}

function ThreadCardImpl({
  thread,
  onTagClick,
  searchQuery,
  onAuthorClick,
  onPreview,
  booklistComment,
  index = 0,
  masonry = false,
  animateIn = true,
  resultPage,
}: ThreadCardProps) {
  const ariaLabel = `帖子：${thread.title}。作者：${thread.author?.display_name || thread.author?.name || "未知"}。${thread.reply_count}条回复，${thread.reaction_count}个点赞。标签：${thread.tags.join(", ")}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPreview?.(thread);
    }
  };
  const {
    fontSize,
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
  const mobileTitleClass = {
    small: "text-xs sm:text-sm",
    medium: "text-sm sm:text-lg",
    large: "text-lg sm:text-2xl",
  }[fontSize];

  // 与 ThreadListItem 保持一致：设置里关掉图片后，网格视图同样不应加载缩略图。
  const initialThumbnail = useMemo(
    () => (imageMode === "off" ? "" : thread.thumbnail_urls?.[0] || ""),
    [thread.thumbnail_urls, imageMode],
  );
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail);
  const articleRef = useRef<HTMLElement>(null);
  const titleViewportRef = useRef<HTMLSpanElement>(null);
  const titleTrackRef = useRef<HTMLSpanElement>(null);
  const [titleShift, setTitleShift] = useState(0);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const shouldMarquee = isTitleHovered && titleShift > 0;

  useEffect(() => {
    setThumbnailSrc(initialThumbnail);
  }, [initialThumbnail, thread.thread_id]);

  useEffect(() => {
    if (imageMode === "off") return;
    return subscribeThreadThumbnailRepair(thread.thread_id, (urls) => {
      if (urls.length > 0) setThumbnailSrc(urls[0]);
    });
  }, [thread.thread_id, imageMode]);

  useEffect(() => {
    const updateTitleShift = () => {
      const viewportWidth = titleViewportRef.current?.clientWidth || 0;
      const trackWidth = titleTrackRef.current?.scrollWidth || 0;
      setTitleShift(Math.max(trackWidth - viewportWidth + 12, 0));
    };

    updateTitleShift();
    window.addEventListener("resize", updateTitleShift);
    // 卡片带 content-visibility:auto，屏外首挂时 layout 被跳过、scrollWidth
    // 读到 0；等浏览器把它渲染出来时（进入视口）借这个事件补一次测量。
    const article = articleRef.current;
    article?.addEventListener("contentvisibilityautostatechange", updateTitleShift);
    return () => {
      window.removeEventListener("resize", updateTitleShift);
      article?.removeEventListener("contentvisibilityautostatechange", updateTitleShift);
    };
  }, [thread.title, fontSize, searchQuery]);

  // 缓存命中直出的页面传 animateIn=false：内容用户已看过，不再重播浮现动画。
  const entranceClass = animateIn
    ? " animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both"
    : "";

  return (
    <>
      <article
        ref={articleRef}
        data-result-page={resultPage}
        role="button"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`group flex w-full cursor-pointer flex-col [content-visibility:auto] [contain-intrinsic-size:auto_560px]${entranceClass} focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) ${masonry ? "h-auto" : "h-full"}`}
        style={{
          animationDelay: animateIn ? animationDelay : undefined,
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
                <div className="mt-0.5 flex h-4 min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden text-[10px] text-(--od-text-tertiary)">
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>{createdTime}</span>
                  </span>
                  {lastActiveTime && (
                    <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap" title={`活跃 ${lastActiveTime}`}>
                      <Clock3 className="h-3 w-3 shrink-0" />
                      <span className="truncate">活跃 {lastActiveTime}</span>
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

          </div>

          <div className="relative aspect-2/3 w-full">
            <BannerFadeMedia className="overflow-hidden rounded-t-[1.45rem]">
              {thumbnailSrc ? (
                <LazyImage
                  src={thumbnailSrc}
                  alt={thread.title}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.015]"
                  threadId={thread.thread_id}
                  channelId={thread.channel_id}
                  index={index}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-(--od-text-tertiary)/20" />
                </div>
              )}
            </BannerFadeMedia>

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

          <div className="relative z-10 -mt-10 flex flex-1 flex-col gap-3 px-2 text-(--od-text-primary)">
            <div className="overflow-hidden">
              <h3
                className={`whitespace-nowrap ${mobileTitleClass} text-(--od-text-primary) drop-shadow-[0_2px_6px_rgb(0_0_0_/_0.7)] transition-colors duration-200 group-hover:text-(--od-accent)`}
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
                      <HighlightText text={thread.title} highlight={searchQuery} />
                    </span>
                    {titleShift > 0 && (
                      <>
                        <span className="mx-7 shrink-0 text-(--od-text-tertiary)/55">/</span>
                        <span className="shrink-0">
                          <HighlightText text={thread.title} highlight={searchQuery} />
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </h3>
            </div>
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
              <ThreadTagList
                thread={thread}
                virtualOnlyTags={virtualOnlyTags}
                onTagClick={onTagClick}
                variant="card"
              />
            </div>

            <ThreadBooklistComment comment={booklistComment} variant="card" />

            <ThreadStatsRow thread={thread} variant="card" />

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
