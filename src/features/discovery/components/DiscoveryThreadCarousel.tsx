import {
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Star,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { getWrappedCarouselIndex } from "@/features/search/lib/discoveryCarousel";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import { LazyImage } from "@/shared/ui/LazyImage";

export type DiscoveryRankingMetric =
  | "reaction"
  | "discussion"
  | "collection"
  | "latest";

interface DiscoveryThreadCarouselProps {
  threads: Thread[];
  loading?: boolean;
  ariaLabel?: string;
  emptyMessage?: string;
  rankingMetric?: DiscoveryRankingMetric;
  onOpen: (thread: Thread) => void;
  onActiveChange?: (thread: Thread, index: number) => void;
}

function getAuthorName(thread: Thread) {
  return (
    thread.author?.display_name ||
    thread.author?.global_name ||
    thread.author?.name ||
    "未知作者"
  );
}

function getRankingValue(thread: Thread, metric: DiscoveryRankingMetric) {
  if (metric === "reaction") return thread.reaction_count;
  if (metric === "discussion") return thread.reply_count;
  if (metric === "collection") return thread.collection_count || 0;
  return formatRelativeDateTime(thread.created_at);
}

export function DiscoveryThreadCarousel({
  threads,
  loading = false,
  ariaLabel = "发现轨道，可滚轮或左右滑动",
  emptyMessage = "这条发现轨道暂时没有内容。",
  rankingMetric,
  onOpen,
  onActiveChange,
}: DiscoveryThreadCarouselProps) {
  const signature = useMemo(
    () => threads.map((thread) => thread.thread_id).join(","),
    [threads],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelTimerRef = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [signature]);

  useEffect(() => {
    const activeThread = threads[activeIndex];
    if (activeThread) onActiveChange?.(activeThread, activeIndex);
  }, [activeIndex, onActiveChange, threads]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (wheelLockedRef.current) return;
      wheelDeltaRef.current +=
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (Math.abs(wheelDeltaRef.current) < 40) return;
      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      setActiveIndex((current) =>
        getWrappedCarouselIndex(current, direction, threads.length),
      );
      wheelDeltaRef.current = 0;
      wheelLockedRef.current = true;
      wheelTimerRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false;
        wheelDeltaRef.current = 0;
        wheelTimerRef.current = null;
      }, 820);
    };
    carousel.addEventListener("wheel", handleWheel, { passive: false });
    return () => carousel.removeEventListener("wheel", handleWheel);
  }, [threads.length]);

  useEffect(
    () => () => {
      if (wheelTimerRef.current !== null) {
        window.clearTimeout(wheelTimerRef.current);
      }
    },
    [],
  );

  const move = (direction: number) => {
    setActiveIndex((current) =>
      getWrappedCarouselIndex(current, direction, threads.length),
    );
  };

  if (loading) {
    return (
      <div className="mx-auto mt-8 h-[calc(clamp(12rem,20vw,20rem)+10rem)] w-[68%] max-w-3xl animate-pulse rounded-3xl bg-(--od-surface-input)" />
    );
  }

  if (threads.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-(--od-text-tertiary)">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div
        ref={carouselRef}
        role="region"
        aria-label={ariaLabel}
        onPointerDown={(event) => {
          pointerStartXRef.current = event.clientX;
          swipeHandledRef.current = false;
        }}
        onPointerUp={(event) => {
          if (pointerStartXRef.current === null) return;
          const distance = event.clientX - pointerStartXRef.current;
          pointerStartXRef.current = null;
          if (Math.abs(distance) >= 42) {
            swipeHandledRef.current = true;
            move(distance < 0 ? 1 : -1);
            window.setTimeout(() => {
              swipeHandledRef.current = false;
            }, 0);
          }
        }}
        onPointerCancel={() => {
          pointerStartXRef.current = null;
        }}
        className="relative mx-auto mt-8 h-[calc(clamp(12rem,20vw,20rem)+10rem)] max-w-7xl touch-pan-y overflow-hidden select-none"
      >
        {threads.map((thread, index) => {
          let offset = index - activeIndex;
          if (offset > threads.length / 2) offset -= threads.length;
          if (offset < -threads.length / 2) offset += threads.length;
          const isActive = offset === 0;
          const placement = isActive
            ? "left-1/2 top-0 w-[60%] max-w-2xl -translate-x-1/2 opacity-100 lg:w-[36%]"
            : offset === -1
              ? "left-[8%] top-0 w-[18%] min-w-0 max-w-52 -translate-x-1/2 opacity-65 lg:left-[21%] lg:w-[14%] lg:min-w-24"
              : offset === 1
                ? "left-[92%] top-0 w-[18%] min-w-0 max-w-52 -translate-x-1/2 opacity-65 lg:left-[79%] lg:w-[14%] lg:min-w-24"
                : offset === -2
                  ? "pointer-events-none left-[6%] top-0 w-[10%] min-w-20 max-w-40 -translate-x-1/2 opacity-0 lg:pointer-events-auto lg:opacity-40"
                  : offset === 2
                    ? "pointer-events-none left-[94%] top-0 w-[10%] min-w-20 max-w-40 -translate-x-1/2 opacity-0 lg:pointer-events-auto lg:opacity-40"
                    : `top-0 w-[10%] min-w-20 max-w-40 -translate-x-1/2 opacity-0 pointer-events-none ${
                        offset < 0 ? "left-0" : "left-full"
                      }`;

          return (
            <article
              key={thread.thread_id}
              aria-current={isActive ? "true" : undefined}
              className={`absolute transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${placement}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (swipeHandledRef.current) {
                    swipeHandledRef.current = false;
                    return;
                  }
                  if (isActive) onOpen(thread);
                  else setActiveIndex(index);
                }}
                className="group block w-full text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
                aria-label={
                  isActive
                    ? `打开帖子：${thread.title}`
                    : `切换到帖子：${thread.title}`
                }
              >
                <span
                  className={`relative block h-[clamp(12rem,20vw,20rem)] overflow-hidden transition-[border-radius] duration-700 ${
                    isActive ? "rounded-3xl" : "rounded-2xl"
                  }`}
                >
                  {thread.thumbnail_urls?.[0] ? (
                    <LazyImage
                      src={thread.thumbnail_urls[0]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                      threadId={thread.thread_id}
                      channelId={thread.channel_id}
                      imageIndex={0}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-(--od-text-tertiary)" />
                    </span>
                  )}
                </span>
                {rankingMetric && (
                  <span className="mt-2 flex h-5 items-center justify-between gap-3 px-0.5 text-[11px] font-medium text-(--od-text-tertiary)">
                    <span className="tabular-nums">#{index + 1}</span>
                    <span className="inline-flex min-w-0 items-center gap-1 tabular-nums">
                      <TrendingUp className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {getRankingValue(thread, rankingMetric)}
                      </span>
                    </span>
                  </span>
                )}
                <span
                  className={`${rankingMetric ? "mt-1" : "mt-4"} block text-center transition-opacity duration-500 ${
                    isActive ? "opacity-100" : "opacity-75"
                  }`}
                >
                  <span
                    className={`mx-auto block line-clamp-2 font-semibold text-(--od-text-primary) transition-[height,font-size,line-height,color] duration-500 group-hover:text-(--od-accent) ${
                      isActive
                        ? "h-14 max-w-3xl text-xl leading-7"
                        : "h-10 text-xs leading-5"
                    }`}
                  >
                    {thread.title}
                  </span>
                  <span
                    className={`transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <span className="mt-2 inline-flex h-6 items-center gap-2 text-xs text-(--od-text-secondary)">
                      <AuthorAvatar
                        author={thread.author}
                        className="h-6 w-6"
                      />
                      {getAuthorName(thread)}
                    </span>
                    <span className="mt-2 flex h-5 items-center justify-center gap-4 text-[11px] text-(--od-text-tertiary)">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {thread.reaction_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {thread.reply_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {thread.collection_count || 0}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </article>
          );
        })}
      </div>

      {threads.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {threads.map((thread, index) => (
            <button
              key={thread.thread_id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`切换到第 ${index + 1} 个作品`}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                activeIndex === index
                  ? "w-8 bg-(--od-accent)"
                  : "w-2 bg-(--od-divider-strong) hover:bg-(--od-text-tertiary)"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
