import {
  Calendar,
  Clock3,
  Eye,
  Hash,
  MessageCircle,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ImageCarousel } from "@/entities/thread/ImageCarousel";
import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import type { Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import { useSearchURLParams } from "@/features/search/hooks/useSearchParams";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import { useLockBodyScroll } from "@/shared/hooks/useLockBodyScroll";
import { useFontSizeSetting } from "@/shared/hooks/useSettings";
import {
  formatAbsoluteDateTime,
  formatRelativeDateTime,
} from "@/shared/lib/dateTime";
import { addToken } from "@/shared/lib/searchTokenizer";
import { fontSizeMap } from "@/shared/lib/settings";
import { MarkdownText } from "@/shared/ui/MarkdownText";
import { AuthorRecommendations } from "@/features/threads/components/AuthorRecommendations";
import { SimilarRecommendations } from "@/features/threads/components/SimilarRecommendations";

import { createPortal } from "react-dom";

interface ThreadPreviewOverlayProps {
  thread: Thread;
  onClose: () => void;
  externalUrlOverride?: string | null;
  hideExternalButton?: boolean;
}

export function ThreadPreviewOverlay({
  thread,
  onClose,
  externalUrlOverride,
  hideExternalButton,
}: ThreadPreviewOverlayProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { params, setParams } = useSearchURLParams();
  const fontSize = useFontSizeSetting();
  const fontSizes = fontSizeMap[fontSize];
  const [isVisible, setIsVisible] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(true);

  useEffect(() => {
    setIsVisible(true);
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  // 切换帖子时重置滚动位置
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [thread.thread_id]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      dialogRef.current?.close();
      onClose();
    }, 300);
  };

  const handleNativeCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    handleClose();
  };

  const createdTime = formatRelativeDateTime(thread.created_at);
  const fullTime = formatAbsoluteDateTime(thread.created_at);
  const lastActiveTime = thread.last_active_at
    ? formatRelativeDateTime(thread.last_active_at)
    : null;
  const virtualOnlyTags = (thread.virtual_tags || []).filter(
    (tag) => !thread.tags?.includes(tag),
  );

  const searchableAuthorName =
    thread.author?.display_name ??
    thread.author?.global_name ??
    thread.author?.name;
  const authorName = searchableAuthorName || "未知用户";

  const applySearchToken = useCallback(
    (type: "tag" | "author", value: string) => {
      const nextQuery = addToken(params.query || "", type, value, "include");

      if (location.pathname !== "/search") {
        navigate(
          nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search",
        );
      } else {
        setParams({ query: nextQuery });
      }

      handleClose();
    },
    [location.pathname, navigate, params.query, setParams],
  );

  return createPortal(
    <>
      <dialog
        ref={dialogRef}
        onCancel={handleNativeCancel}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            handleClose();
          }
        }}
        aria-labelledby="thread-preview-title"
        className={`fixed inset-x-3 inset-y-3 z-2000 m-auto flex h-[calc(100vh-1.5rem)] min-h-0 w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-[1.6rem] p-0 backdrop:bg-black/60 backdrop:backdrop-blur-xs transition-all duration-300 supports-[height:100dvh]:h-[calc(100dvh-1.5rem)] sm:inset-x-6 sm:inset-y-6 sm:h-[calc(100vh-3rem)] sm:w-[calc(100%-3rem)] sm:supports-[height:100dvh]:h-[calc(100dvh-3rem)] ${isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0 backdrop:bg-black/0 backdrop:backdrop-blur-none"
          } od-floating-panel-solid`}
      >
        {/* Header */}
        <div className="border-b border-(--od-shell-line) bg-(--od-surface-floating) px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex flex-1 items-start gap-3">
              {thread.author?.id ? (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    navigate(`/u/${thread.author!.id}`);
                  }}
                  className="shrink-0"
                  title={`查看作者主页：${authorName}`}
                >
                  <AuthorAvatar
                    author={thread.author}
                    className="h-10 w-10 transition-opacity hover:opacity-80"
                  />
                </button>
              ) : (
                <AuthorAvatar author={thread.author} className="h-10 w-10" />
              )}
              <div className="min-w-0">
                {thread.author?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate(`/u/${thread.author!.id}`);
                    }}
                    className="truncate text-left font-bold text-(--od-text-primary) hover:text-(--od-accent) hover:underline"
                    title={`查看作者主页：${authorName}`}
                  >
                    {authorName}
                  </button>
                ) : (
                  <div className="truncate font-bold text-(--od-text-primary)">
                    {authorName}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThreadStatusBadges
                isFollowing={thread.collected_flag}
                hasUpdate={thread.has_update}
                variant="detail"
              />
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="rounded-full px-2 py-1 text-xs text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                title="加入书单"
              >
                +书单
              </button>
              {!hideExternalButton && (
                <ThreadActions
                  threadId={thread.thread_id}
                  channelId={thread.channel_id}
                  guildId={thread.guild_id}
                  size="sm"
                  alwaysVisible={true}
                  externalUrlOverride={externalUrlOverride}
                />
              )}
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-(--od-text-tertiary)">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1" title={fullTime}>
                <Calendar className="h-3.5 w-3.5" />
                发布于 {createdTime}
              </span>
              {lastActiveTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  活跃于 {lastActiveTime}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {thread.reply_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                {thread.reaction_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {thread.display_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                ID: {thread.thread_id}
              </span>
            </div>
          </div>

          {/* Title */}
          <h2
            id="thread-preview-title"
            className="mt-4 text-xl font-extrabold leading-snug tracking-[-0.02em] text-(--od-text-primary) wrap-break-word"
          >
            {thread.title}
          </h2>

          {/* Images */}
          {thread.thumbnail_urls && thread.thumbnail_urls.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-(--od-shell-line)">
              <ImageCarousel
                images={thread.thumbnail_urls}
                alt={thread.title}
                className="h-75 sm:h-100"
              />
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto bg-(--od-surface-floating) p-6 scrollbar-thin"
        >

          {/* Tags */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {thread.tags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => applySearchToken("tag", tag)}
                  className="od-pill-chip"
                  title={`添加标签筛选：${tag}`}
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          )}
          {virtualOnlyTags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {virtualOnlyTags.map((tag) => (
                <button
                  type="button"
                  key={`vt-${tag}`}
                  onClick={() => applySearchToken("tag", tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-(--od-accent)/24 bg-(--od-accent)/10 px-3 py-1 text-xs font-semibold text-(--od-accent) transition-colors hover:bg-(--od-accent)/18"
                  title={`添加标签筛选：${tag}`}
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Content Excerpt (Full) - Flat, no background */}
          {thread.first_message_excerpt && (
            <div
              className={`mb-6 ${fontSizes.content} text-(--od-text-secondary)`}
            >
              <MarkdownText text={thread.first_message_excerpt} />
            </div>
          )}

          {/* Recommendations */}
          <ThreadTournamentBadges
            thread={thread}
            variant="tags"
            onNavigate={handleClose}
          />
          <SimilarRecommendations currentThreadId={thread.thread_id} />
          {thread.author?.id && (
            <AuthorRecommendations
              authorId={thread.author.id}
              authorName={authorName}
              currentThreadId={thread.thread_id}
            />
          )}
        </div>
      </dialog>
      <QuickAddToBooklistModal
        isOpen={quickAddOpen}
        threadId={thread.thread_id}
        threadTitle={thread.title}
        onClose={() => setQuickAddOpen(false)}
      />
    </>,
    document.body
  );
}
