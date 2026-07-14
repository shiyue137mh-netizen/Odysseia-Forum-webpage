import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  MessageCircle,
  ThumbsUp,
  UserRoundX,
} from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { Author, Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { authorsApi } from "@/features/authors/api/authorsApi";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { searchApi } from "@/features/search/api/searchApi";
import { usePreviewStore } from "@/features/search/store/previewStore";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { LazyImage } from "@/shared/ui/LazyImage";

const OPEN_DELAY = 300;
const CLOSE_DELAY = 180;
const PANEL_WIDTH = 320;
const VIEWPORT_PADDING = 8;
const PANEL_GAP = 10;

interface AuthorWorksHoverCardProps {
  author: Author;
  currentThreadId?: string;
  children: ReactNode;
}

export function AuthorWorksHoverCard({
  author,
  currentThreadId,
  children,
}: AuthorWorksHoverCardProps) {
  const navigate = useNavigate();
  const setPreviewThreadId = usePreviewStore(
    (state) => state.setPreviewThreadId,
  );
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const { user, preferences, savePreferences, isSaving } = useUserPreferences({
    guildId: GUILD_ID,
  });

  const authorName = author.display_name || author.global_name || author.name;
  const excludedAuthorIds = (preferences?.exclude_authors || []).map(String);
  const isAuthorBlocked = excludedAuthorIds.includes(String(author.id));

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setIsOpen(false);
  }, [clearCloseTimer, clearOpenTimer]);

  const openSoon = useCallback(() => {
    if (isOpen) return;
    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
      openTimerRef.current = null;
    }, OPEN_DELAY);
  }, [clearCloseTimer, clearOpenTimer, isOpen]);

  const openNow = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer, clearOpenTimer]);

  const keepOpen = useCallback(() => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  const closeSoon = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (
        (activeElement && triggerRef.current?.contains(activeElement)) ||
        (activeElement && panelRef.current?.contains(activeElement))
      ) {
        closeTimerRef.current = null;
        return;
      }
      setIsOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY);
  }, [clearCloseTimer, clearOpenTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      close();
      return;
    }

    const width = Math.min(
      PANEL_WIDTH,
      window.innerWidth - VIEWPORT_PADDING * 2,
    );
    const height = panelRef.current?.offsetHeight || 280;
    let left = rect.right + PANEL_GAP;
    let top = rect.top;

    if (left + width > window.innerWidth - VIEWPORT_PADDING) {
      left = rect.left - width - PANEL_GAP;
    }
    if (top + height > window.innerHeight - VIEWPORT_PADDING) {
      top = rect.bottom - height;
    }

    setPanelStyle({
      left: Math.max(
        VIEWPORT_PADDING,
        Math.min(left, window.innerWidth - width - VIEWPORT_PADDING),
      ),
      top: Math.max(
        VIEWPORT_PADDING,
        Math.min(top, window.innerHeight - height - VIEWPORT_PADDING),
      ),
      width,
    });
  }, [close]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, [clearCloseTimer, clearOpenTimer]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current
        ?.querySelector<HTMLElement>("button, a, [tabindex]")
        ?.focus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
      close();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, isOpen, updatePosition]);

  useEffect(() => {
    if (!confirmBlockOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmBlockOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmBlockOpen]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "search",
      "author-works-hover",
      author.id,
      currentThreadId || null,
    ],
    queryFn: () =>
      searchApi.search({
        include_authors: [author.id],
        exclude_thread_ids: currentThreadId ? [currentThreadId] : undefined,
        apply_preferences: true,
        limit: 3,
        sort_method: "created_desc",
      }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: ["author-profile", author.id],
    queryFn: () => authorsApi.getAuthorProfile(author.id),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const threads = (data?.results || []) as Thread[];

  const openThread = (threadId: string) => {
    close();
    setPreviewThreadId(threadId);
  };

  const openAuthorPage = () => {
    close();
    navigate(`/u/${author.id}`);
  };

  const toggleAuthorBlock = async () => {
    if (!user?.id || isSaving) return;
    const authorId = String(author.id);
    const nextExcludedAuthorIds = isAuthorBlocked
      ? excludedAuthorIds.filter((id) => id !== authorId)
      : Array.from(new Set([...excludedAuthorIds, authorId]));
    const includedAuthorIds = (preferences?.include_authors || []).map(String);

    try {
      await savePreferences({
        preferred_channels: preferences?.preferred_channels || [],
        exclude_authors: nextExcludedAuthorIds,
        include_authors: isAuthorBlocked
          ? includedAuthorIds
          : includedAuthorIds.filter((id) => id !== authorId),
      });
      toast.success(
        isAuthorBlocked
          ? `已取消屏蔽 ${authorName}`
          : `已将 ${authorName} 加入屏蔽`,
      );
    } catch {
      toast.error("偏好保存失败，请稍后再试");
    }
  };

  const panel = isOpen ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${authorName} 的其他作品`}
      style={panelStyle}
      onClick={(event) => event.stopPropagation()}
      onPointerEnter={keepOpen}
      onPointerLeave={closeSoon}
      onFocus={keepOpen}
      onBlur={closeSoon}
      className="od-floating-glass fixed z-[9999] overflow-hidden rounded-2xl border border-(--od-border-strong) shadow-(--od-shadow-floating) animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-start gap-2 border-b border-(--od-shell-line) px-2 py-2">
        <button
          type="button"
          onClick={openAuthorPage}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-(--od-interactive-hover)"
        >
          <AuthorAvatar
            author={author}
            className="h-9 w-9 ring-1 ring-(--od-border-strong)/35"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-(--od-text-primary)">
              {authorName}
            </span>
            <span className="block truncate text-[11px] text-(--od-text-tertiary)">
              @{author.name}
            </span>
            <span className="mt-1.5 flex items-center gap-2.5 text-[10px] text-(--od-text-tertiary)">
              <span>
                <strong className="font-medium text-(--od-text-secondary)">
                  {profile?.stats.thread_count ?? "—"}
                </strong>{" "}
                作品
              </span>
              <span>
                <strong className="font-medium text-(--od-text-secondary)">
                  {profile?.stats.reaction_count ?? "—"}
                </strong>{" "}
                点赞
              </span>
              <span>
                <strong className="font-medium text-(--od-text-secondary)">
                  {profile?.stats.reply_count ?? "—"}
                </strong>{" "}
                回复
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (isAuthorBlocked) void toggleAuthorBlock();
            else setConfirmBlockOpen(true);
          }}
          disabled={!user?.id || isSaving}
          aria-pressed={isAuthorBlocked}
          aria-label={isAuthorBlocked ? "取消屏蔽作者" : "屏蔽作者"}
          title={isAuthorBlocked ? "取消屏蔽作者" : "屏蔽作者"}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            isAuthorBlocked
              ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
              : "text-(--od-text-tertiary) hover:bg-(--od-interactive-hover) hover:text-rose-400"
          }`}
        >
          <UserRoundX className="h-4 w-4" />
        </button>
      </div>

      <div className="p-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse items-center gap-3 rounded-xl p-2"
            >
              <div className="h-13 w-13 shrink-0 rounded-lg bg-(--od-bg-tertiary)" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-4/5 rounded bg-(--od-bg-tertiary)" />
                <div className="h-2.5 w-2/5 rounded bg-(--od-bg-tertiary)" />
              </div>
            </div>
          ))}

        {isError && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-(--od-text-tertiary)">作品加载失败</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-xs font-medium text-(--od-accent) hover:text-(--od-accent-hover)"
            >
              重试
            </button>
          </div>
        )}

        {!isLoading && !isError && threads.length === 0 && (
          <p className="px-3 py-6 text-center text-xs leading-5 text-(--od-text-tertiary)">
            暂未收录该作者的其他作品，或已被偏好设置过滤。
          </p>
        )}

        {!isLoading &&
          !isError &&
          threads.map((thread) => {
            const thumbnail = thread.thumbnail_urls?.[0];
            return (
              <button
                key={thread.thread_id}
                type="button"
                onClick={() => openThread(thread.thread_id)}
                className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-(--od-interactive-hover) focus-visible:outline-2 focus-visible:outline-(--od-accent)"
              >
                <span className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-(--od-bg-tertiary)">
                  {thumbnail ? (
                    <LazyImage
                      src={thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <FileText className="h-4 w-4 text-(--od-text-tertiary)" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-xs font-medium leading-4 text-(--od-text-primary)">
                    {thread.title}
                  </span>
                  <span className="mt-1.5 flex items-center gap-3 text-[10px] text-(--od-text-tertiary)">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {thread.reaction_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {thread.reply_count}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
      </div>

      <button
        type="button"
        onClick={openAuthorPage}
        className="w-full border-t border-(--od-shell-line) px-4 py-2.5 text-center text-xs font-medium text-(--od-accent) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-accent-hover)"
      >
        查看全部作品
      </button>
    </div>
  ) : null;

  const confirmationDialog = confirmBlockOpen ? (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="author-block-confirm-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={() => setConfirmBlockOpen(false)}
    >
      <div
        className="od-floating-panel-solid w-full max-w-sm rounded-2xl border border-(--od-border-strong) p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
            <UserRoundX className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2
              id="author-block-confirm-title"
              className="text-base font-semibold text-(--od-text-primary)"
            >
              屏蔽这位作者？
            </h2>
            <p className="mt-0.5 truncate text-xs text-(--od-text-tertiary)">
              {authorName}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-(--od-text-secondary)">
          屏蔽会永久写入探索偏好。之后广场、搜索和随机发现会尽量排除该作者的作品，你仍可以在偏好设置中取消。
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmBlockOpen(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setConfirmBlockOpen(false);
              void toggleAuthorBlock();
            }}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:pointer-events-none disabled:opacity-55"
          >
            确认屏蔽
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") openSoon();
        }}
        onPointerLeave={closeSoon}
        onFocus={openNow}
        onBlur={closeSoon}
      >
        {children}
      </span>
      {panel && createPortal(panel, document.body)}
      {confirmationDialog && createPortal(confirmationDialog, document.body)}
    </>
  );
}
