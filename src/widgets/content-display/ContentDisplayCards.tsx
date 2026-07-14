import {
  BookOpen,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  RotateCw,
  Star,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Booklist } from "@/entities/booklist/types";
import type { Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
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
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] text-(--od-text-tertiary)">
            <AuthorAvatar author={thread.author} className="h-4.5 w-4.5" />
            <span className="truncate">{authorName}</span>
          </span>
        </span>
      </button>
    </article>
  );
}

interface CompactBooklistCardProps {
  booklist: Booklist;
  collectLoading?: boolean;
  onOpen: (booklistId: number) => void;
  onToggleCollect: (booklist: Booklist) => void;
}

export function CompactBooklistCard({
  booklist,
  collectLoading,
  onOpen,
  onToggleCollect,
}: CompactBooklistCardProps) {
  const ownerName =
    booklist.author?.display_name ||
    booklist.author?.global_name ||
    booklist.author?.name ||
    `用户 ${booklist.owner_id}`;

  return (
    <article className="group relative min-w-0 rounded-2xl bg-[color-mix(in_srgb,var(--od-surface-raised)_74%,transparent)] p-3 transition-colors hover:bg-[color-mix(in_srgb,var(--od-surface-raised)_90%,transparent)]">
      <button
        type="button"
        onClick={() => onOpen(booklist.id)}
        className="grid w-full min-w-0 grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-4 rounded-xl text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) sm:grid-cols-[10rem_minmax(0,1fr)]"
        aria-label={`打开书单：${booklist.title}`}
      >
        <span className="aspect-4/3 overflow-hidden rounded-xl bg-(--od-surface-shell)">
          {booklist.cover_image_url ? (
            <LazyImage
              src={booklist.cover_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-5 w-5 text-(--od-text-tertiary)" />
            </span>
          )}
        </span>

        <span className="min-w-0 pr-9">
          <span className="line-clamp-2 text-base font-semibold leading-5 text-(--od-text-primary) transition-colors group-hover:text-(--od-text-heading)">
            {booklist.title}
          </span>
          <span className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-(--od-text-tertiary)">
            <AuthorAvatar author={booklist.author} className="h-5 w-5" />
            <span className="truncate">{ownerName}</span>
          </span>
          <span className="mt-2 flex items-center gap-3 text-[10px] text-(--od-text-tertiary)">
            <span>{booklist.item_count} 篇</span>
            <span>{booklist.collection_count} 收藏</span>
          </span>
        </span>
      </button>

      <button
        type="button"
        disabled={collectLoading}
        onClick={() => onToggleCollect(booklist)}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-accent) disabled:pointer-events-none disabled:opacity-50"
        aria-label={booklist.collected_flag ? "取消收藏书单" : "收藏书单"}
      >
        <Star
          className={`h-3.5 w-3.5 ${booklist.collected_flag ? "fill-current text-(--od-accent)" : ""}`}
        />
      </button>
    </article>
  );
}

export type ThreadRankingMetric =
  | "reaction"
  | "discussion"
  | "collection"
  | "latest";

interface ThreadRankingPanelProps {
  title: string;
  badge: string;
  threads: Thread[];
  metric: ThreadRankingMetric;
  refreshing?: boolean;
  onOpen: (thread: Thread) => void;
  onRefresh: () => void;
}

function getMetricValue(thread: Thread, metric: ThreadRankingMetric) {
  if (metric === "reaction") return String(thread.reaction_count);
  if (metric === "discussion") return String(thread.reply_count);
  if (metric === "collection") return String(thread.collection_count || 0);
  return formatRelativeDateTime(thread.created_at);
}

function getMetricIcon(metric: ThreadRankingMetric) {
  if (metric === "reaction") return Heart;
  if (metric === "discussion") return MessageCircle;
  if (metric === "collection") return Star;
  return null;
}

export function ThreadRankingPanel({
  title,
  badge,
  threads,
  metric,
  refreshing,
  onOpen,
  onRefresh,
}: ThreadRankingPanelProps) {
  const items = useMemo(() => threads.slice(0, 20), [threads]);
  const signature = items.map((thread) => thread.thread_id).join(",");
  const viewportRef = useRef<HTMLDivElement>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const MetricIcon = getMetricIcon(metric);

  const scrollToIndex = useCallback((index: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const firstRow = viewport.querySelector<HTMLElement>("[data-rank-row]");
    const rowHeight = firstRow?.offsetHeight || 44;
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    viewport.scrollTo?.({
      top: index * rowHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const firstRow = viewport.querySelector<HTMLElement>("[data-rank-row]");
    const rowHeight = firstRow?.offsetHeight || 44;
    const initialIndex = Math.min(2, Math.max(items.length - 1, 0));
    viewport.scrollTop = initialIndex * rowHeight;
    setActiveIndex(initialIndex);
  }, [items.length, scrollToIndex, signature]);

  useEffect(() => {
    return () => {
      if (wheelUnlockTimerRef.current !== null) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (wheelLockedRef.current) return;
      wheelDeltaRef.current += event.deltaY;
      if (Math.abs(wheelDeltaRef.current) < 24) return;

      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      wheelLockedRef.current = true;
      scrollToIndex(
        Math.max(
          0,
          Math.min(items.length - 1, activeIndexRef.current + direction),
        ),
      );
      // ponytail: 220ms 固定锁定用于压住触控板惯性；若以后需要可配置手感，再改为设置项。
      wheelUnlockTimerRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false;
        wheelDeltaRef.current = 0;
        wheelUnlockTimerRef.current = null;
      }, 220);
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [signature]);

  if (items.length === 0) return null;

  const activeThread = items[activeIndex] || items[0];
  const activeThumbnail = activeThread?.thumbnail_urls?.[0];

  return (
    <section className="rounded-2xl bg-[color-mix(in_srgb,var(--od-surface-floating)_72%,transparent)] p-4 shadow-(--od-shadow-soft)">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-(--od-text-primary)">
            {title}
          </h3>
          <p className="mt-0.5 text-[10px] text-(--od-text-tertiary)">
            {badge}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-accent) disabled:opacity-50"
          aria-label={`换一批${title}`}
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => onOpen(activeThread)}
          aria-label={`打开帖子：${activeThread.title}`}
          className="group/image relative aspect-3/4 min-w-0 overflow-hidden rounded-xl bg-(--od-surface-shell) focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
        >
          {activeThumbnail ? (
            <LazyImage
              key={activeThread.thread_id}
              src={activeThumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 animate-in fade-in group-hover/image:scale-[1.025]"
              threadId={activeThread.thread_id}
              channelId={activeThread.channel_id}
              imageIndex={0}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_70%_25%,color-mix(in_srgb,var(--od-accent)_20%,transparent),transparent_38%),linear-gradient(145deg,var(--od-surface-raised),var(--od-surface-shell))]">
              <ImageIcon className="h-5 w-5 text-(--od-text-tertiary)" />
            </span>
          )}
        </button>

        <div
          ref={viewportRef}
          role="region"
          aria-label={`${title}排行，可上下滚动`}
          onScroll={(event) => {
            const viewport = event.currentTarget;
            const firstRow =
              viewport.querySelector<HTMLElement>("[data-rank-row]");
            const rowHeight = firstRow?.offsetHeight || 44;
            setActiveIndex(
              Math.max(
                0,
                Math.min(
                  items.length - 1,
                  Math.round(viewport.scrollTop / rowHeight),
                ),
              ),
            );
          }}
          className="h-[13.75rem] min-w-0 snap-y snap-mandatory scroll-smooth overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div aria-hidden="true" className="h-22" />
          {items.map((thread, index) => (
            <button
              key={thread.thread_id}
              type="button"
              data-rank-row
              aria-current={activeIndex === index ? "true" : undefined}
              onFocus={() => scrollToIndex(index)}
              onClick={() => onOpen(thread)}
              className="flex h-11 w-full snap-center snap-always items-center gap-2 rounded-lg px-2 text-left text-(--od-text-tertiary) transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) hover:text-(--od-text-secondary)"
            >
              <span className="w-3 shrink-0 text-center text-[11px] font-semibold">
                {index + 1}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs transition-colors ${
                  activeIndex === index
                    ? "font-semibold text-(--od-accent)"
                    : ""
                }`}
              >
                {thread.title}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-(--od-text-tertiary)">
                {MetricIcon && <MetricIcon className="h-3 w-3" />}
                {getMetricValue(thread, metric)}
              </span>
            </button>
          ))}
          <div aria-hidden="true" className="h-22" />
        </div>
      </div>
    </section>
  );
}
