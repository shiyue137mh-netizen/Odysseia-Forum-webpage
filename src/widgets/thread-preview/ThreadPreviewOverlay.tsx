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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ImageCarousel } from "@/entities/thread/ImageCarousel";
import { ThreadStatusBadges } from "@/entities/thread/ThreadStatusBadges";
import { ThreadTournamentBadges } from "@/entities/thread/ThreadTournamentBadges";
import type { Thread } from "@/entities/thread/types";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { QuickAddToBooklistModal } from "@/features/booklists/components/QuickAddToBooklistModal";
import { useSearchURLParams } from "@/features/search/hooks/useSearchParams";
import { ThreadActions } from "@/features/threads/components/ThreadActions";
import { useLockBodyScroll } from "@/shared/hooks/useLockBodyScroll";
import { useFontSizeSetting } from "@/shared/hooks/useSettings";
import {
  formatAbsoluteDateTime,
  formatRelativeDateTime,
} from "@/shared/lib/dateTime";
import { addToken, tokenizeSearchPayload } from "@/shared/lib/searchTokenizer";
import { fontSizeMap } from "@/shared/lib/settings";
import { MarkdownText } from "@/shared/ui/MarkdownText";
import { HighlightText } from "@/shared/ui/HighlightText";
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const wheelGestureActiveRef = useRef(false);
  const wheelGestureStartedAtTopRef = useRef(false);
  const wheelDismissDeltaRef = useRef(0);
  const wheelGestureTimerRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchGestureStartedAtTopRef = useRef(false);

  useLockBodyScroll(true);

  useEffect(() => {
    setIsVisible(true);
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
      closeButtonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // 切换帖子时重置滚动位置
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [thread.thread_id]);

  useEffect(
    () => () => {
      if (wheelGestureTimerRef.current !== null) {
        window.clearTimeout(wheelGestureTimerRef.current);
      }
    },
    [],
  );

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsVisible(false);
    setTimeout(() => {
      dialogRef.current?.close();
      onClose();
    }, 300);
  };

  const finishWheelGesture = () => {
    wheelGestureActiveRef.current = false;
    wheelGestureStartedAtTopRef.current = false;
    wheelDismissDeltaRef.current = 0;
    wheelGestureTimerRef.current = null;
  };

  const handleContentWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (quickAddOpen || isClosingRef.current) return;

    if (!wheelGestureActiveRef.current) {
      wheelGestureActiveRef.current = true;
      wheelGestureStartedAtTopRef.current = event.currentTarget.scrollTop <= 1;
      wheelDismissDeltaRef.current = 0;
    }

    if (wheelGestureTimerRef.current !== null) {
      window.clearTimeout(wheelGestureTimerRef.current);
    }
    wheelGestureTimerRef.current = window.setTimeout(finishWheelGesture, 180);

    if (!wheelGestureStartedAtTopRef.current || event.deltaY >= 0) return;
    wheelDismissDeltaRef.current += Math.abs(event.deltaY);
    if (wheelDismissDeltaRef.current >= 48) handleClose();
  };

  const handleContentTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (quickAddOpen || isClosingRef.current) return;
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    touchGestureStartedAtTopRef.current = event.currentTarget.scrollTop <= 1;
  };

  const handleContentTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (
      !touchGestureStartedAtTopRef.current ||
      touchStartYRef.current === null ||
      quickAddOpen ||
      isClosingRef.current
    ) {
      return;
    }
    const currentY = event.touches[0]?.clientY;
    if (currentY !== undefined && currentY - touchStartYRef.current >= 72) {
      handleClose();
    }
  };

  const finishTouchGesture = () => {
    touchStartYRef.current = null;
    touchGestureStartedAtTopRef.current = false;
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
  const images = thread.thumbnail_urls || [];
  const searchHighlight = useMemo(
    () => tokenizeSearchPayload(params.query || "").text.trim(),
    [params.query],
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
        className={`fixed inset-0 z-2000 m-0 flex h-dvh min-h-0 w-full min-w-0 max-w-none flex-col overflow-hidden rounded-none p-0 backdrop:bg-black/60 backdrop:backdrop-blur-xs transition-all duration-300 sm:inset-x-6 sm:inset-y-6 sm:m-auto sm:h-[calc(100vh-3rem)] sm:w-[calc(100%-3rem)] sm:max-w-2xl sm:rounded-[1.6rem] sm:supports-[height:100dvh]:h-[calc(100dvh-3rem)] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0 backdrop:bg-black/0 backdrop:backdrop-blur-none"
        } od-floating-panel-solid`}
      >
        {/* Header */}
        <div className="min-w-0 border-b border-(--od-shell-line) bg-(--od-surface-floating) px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex flex-1 items-start gap-3">
              <AuthorIdentityLink
                author={thread.author}
                currentThreadId={thread.thread_id}
                avatarClassName="h-10 w-10"
                nameClassName="font-bold text-(--od-text-primary)"
                className="max-w-full"
                onNavigate={({ id }) => {
                  handleClose();
                  navigate(`/u/${id}`);
                }}
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
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
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                aria-label="关闭帖子详情"
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
            className="mt-4 min-w-0 max-w-full text-xl font-extrabold leading-snug tracking-[-0.02em] text-(--od-text-primary) [overflow-wrap:anywhere]"
          >
            <HighlightText text={thread.title} highlight={searchHighlight} />
          </h2>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          onWheel={handleContentWheel}
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={finishTouchGesture}
          onTouchCancel={finishTouchGesture}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-(--od-surface-floating) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Images */}
          {images.length > 0 && (
            <div className="sticky top-0 h-[68dvh] min-h-[28rem] max-h-[46rem] overflow-hidden">
              <ImageCarousel
                images={images}
                alt={thread.title}
                className="h-full [&_img]:object-top"
              />
            </div>
          )}

          <div
            className={`od-floating-glass relative z-10 min-h-full min-w-0 max-w-full px-4 pb-6 pt-6 backdrop-blur-[var(--od-glass-blur)] backdrop-saturate-125 sm:px-6 ${images.length > 0 ? "-mt-12 rounded-t-[1.5rem] shadow-[0_-12px_30px_rgba(0,0,0,0.22)]" : ""}`}
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
                className={`mb-6 min-w-0 max-w-full [overflow-wrap:anywhere] ${fontSizes.content} text-(--od-text-secondary)`}
              >
                <MarkdownText text={thread.first_message_excerpt} highlight={searchHighlight} />
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
        </div>
      </dialog>
      <QuickAddToBooklistModal
        isOpen={quickAddOpen}
        threadId={thread.thread_id}
        threadTitle={thread.title}
        onClose={() => setQuickAddOpen(false)}
      />
    </>,
    document.body,
  );
}
