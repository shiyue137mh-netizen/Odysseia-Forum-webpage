import {
  BookOpen,
  Calendar,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ThreadBooklistComment } from "@/entities/thread/ThreadBooklistComment";
import { ThreadStatsRow } from "@/entities/thread/ThreadStatsRow";
import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTagList } from "@/features/threads/components/ThreadTagList";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import type { Thread } from "@/entities/thread/types";
import { useThreadCardModel } from "@/entities/thread/useThreadCardModel";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import type { ThreadItemManagementActions } from "@/features/threads/components/threadItemActions";
import { subscribeThreadThumbnailRepair } from "@/features/threads/lib/thumbnailRepairQueue";
import { useImageModeSetting } from "@/shared/hooks/useSettings";
import { DiscordMarkdownText } from "@/shared/ui/DiscordMarkdownText";
import { HighlightText } from "@/shared/ui/HighlightText";
import { LazyImage } from "@/shared/ui/LazyImage";
import { BannerFadeMedia } from "@/shared/ui/BannerFadeMedia";
import {
  ContextMenu,
  ContextMenuButton,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/ContextMenu";

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
  managementActions?: ThreadItemManagementActions;
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
  masonry = false,
  animateIn = true,
  resultPage,
  managementActions,
}: ThreadCardProps) {
  const navigate = useNavigate();
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/threads/${thread.thread_id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("已复制帖子链接");
    } catch {
      toast.error("复制链接失败");
    }
  };

  const handleFindSimilar = () => {
    if (thread.tags && thread.tags.length > 0) {
      const tagQueries = thread.tags
        .slice(0, 3)
        .map((t) => `tag:${t}`)
        .join(" ");
      navigate(`/search?q=${encodeURIComponent(tagQueries)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(thread.title)}`);
    }
  };

  const handleAISimilar = () => {
    const promptParts = [
      `请帮我寻找与以下作品在题材、设定、写作风格或核心看点上相似的论坛作品：\n`,
      `【作品标题】：${thread.title}`,
      `【作者】：${thread.author?.display_name || thread.author?.name || "未知"}`,
      `【标签分类】：${thread.tags && thread.tags.length > 0 ? thread.tags.join(", ") : "无"}`,
    ];
    if (thread.first_message_excerpt && thread.first_message_excerpt.trim()) {
      promptParts.push(
        `【作品简介/正文前瞻】：\n${thread.first_message_excerpt.trim()}`,
      );
    }

    const fullPrompt = promptParts.join("\n");
    navigate(`/ai-search?prompt=${encodeURIComponent(fullPrompt)}`, {
      state: { initialPrompt: fullPrompt, autoSend: true },
    });
  };

  const handleOpenInNewTab = () => {
    window.open(`/threads/${thread.thread_id}`, "_blank", "noopener,noreferrer");
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
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(
    () => thumbnailAspectRatioCache.get(initialThumbnail) || null,
  );
  useEffect(() => {
    setThumbnailSrc(initialThumbnail);
    setNaturalAspectRatio(
      thumbnailAspectRatioCache.get(initialThumbnail) || null,
    );
  }, [initialThumbnail, thread.thread_id]);

  useEffect(() => {
    if (imageMode === "off") return;
    return subscribeThreadThumbnailRepair(thread.thread_id, (urls) => {
      if (urls.length > 0) setThumbnailSrc(urls[0]);
    });
  }, [thread.thread_id, imageMode]);

  // 缓存命中直出的页面传 animateIn=false：内容用户已看过，不再重播浮现动画。
  const entranceClass = animateIn
    ? " animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both"
    : "";

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className={masonry ? "h-auto w-full" : "h-full w-full"}>
          <article
            data-result-page={resultPage}
            className={`group flex w-full flex-col [content-visibility:auto] [contain-intrinsic-size:auto_560px]${entranceClass} ${masonry ? "h-auto" : "h-full"}`}
        style={{
          animationDelay: animateIn ? animationDelay : undefined,
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest("button, a"))
            e.preventDefault();
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("[data-thread-preview]")) {
            onPreview?.(thread);
          }
        }}
      >
        <div
          className={`flex w-full flex-col pointer-events-auto ${masonry ? "h-auto" : "h-full"}`}
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

          <div
            data-thread-preview
            className={`relative w-full ${masonry ? "" : "aspect-2/3"}`}
            style={masonry ? { aspectRatio: naturalAspectRatio || 2 / 3 } : undefined}
          >
            <BannerFadeMedia className="overflow-hidden rounded-t-[1.45rem]">
              {thumbnailSrc ? (
                <LazyImage
                  src={thumbnailSrc}
                  alt={thread.title}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.015]"
                  threadId={thread.thread_id}
                  channelId={thread.channel_id}
                  index={index}
                  subscribeToRecovery={false}
                  onNaturalSize={(width, height) => {
                    if (!masonry || width <= 0 || height <= 0) return;
                    // ponytail: 瀑布流按图片自然比例排布，但限制极端长图，避免单卡占满整列。
                    const ratio = Math.min(1.5, Math.max(0.5, width / height));
                    thumbnailAspectRatioCache.set(thumbnailSrc, ratio);
                    setNaturalAspectRatio(ratio);
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-(--od-text-tertiary)/20" />
                </div>
              )}
            </BannerFadeMedia>

            <div className="absolute right-3 top-3 z-20 flex items-center gap-2 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
              {managementActions && (
                <ContextMenuButton
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                  aria-label="管理书单内帖子"
                  title="更多操作"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </ContextMenuButton>
              )}
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
            <button
              type="button"
              data-thread-preview
              className="cursor-pointer overflow-hidden text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
              aria-label={`预览帖子：${thread.title}`}
            >
              <h3
                className={`line-clamp-2 min-h-[2lh] ${mobileTitleClass} font-extrabold leading-snug tracking-[-0.02em] text-(--od-text-primary) transition-colors duration-200 group-hover:text-(--od-accent)`}
              >
                <HighlightText text={thread.title} highlight={searchQuery} />
              </h3>
            </button>
            <div className="min-h-11">
              {hasExcerpt && (
                <p
                  data-thread-preview
                  className={`${fontSizes.content} line-clamp-2 cursor-pointer leading-relaxed text-(--od-text-secondary) transition-colors duration-200 group-hover:text-[color-mix(in_srgb,var(--od-text-secondary)_72%,var(--od-text-primary))]`}
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
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            icon={<Search className="h-4 w-4" />}
            onClick={handleFindSimilar}
          >
            找相似作品
          </ContextMenuItem>
          <ContextMenuItem
            icon={<Sparkles className="h-4 w-4" />}
            onClick={handleAISimilar}
          >
            AI 探索相似
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            icon={<Copy className="h-4 w-4" />}
            onClick={handleCopyLink}
          >
            复制帖子链接
          </ContextMenuItem>
          <ContextMenuItem
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={handleOpenInNewTab}
          >
            在新标签页打开
          </ContextMenuItem>
          {managementActions && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                icon={<Edit3 className="h-4 w-4" />}
                onClick={managementActions.onEdit}
              >
                编辑书单备注
              </ContextMenuItem>
              <ContextMenuItem
                variant="danger"
                disabled={managementActions.removePending}
                icon={<Trash2 className="h-4 w-4" />}
                onClick={managementActions.onRemove}
              >
                {managementActions.removePending ? "移除中…" : "从书单移除"}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

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
