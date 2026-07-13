import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, RefreshCw, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import {
  discoveryApi,
  type DiscoveryRailKey,
} from "@/features/discovery/api/discoveryApi";
import { searchApi } from "@/features/search/api/searchApi";
import {
  chooseDiscoveryTags,
  getStoredDiscoveryTags,
  saveDiscoveryTags,
} from "@/features/search/lib/searchDiscoveryTags";
import { getWrappedCarouselIndex } from "@/features/search/lib/discoveryCarousel";
import { LazyImage } from "@/shared/ui/LazyImage";
import {
  CompactThreadCard,
  CompactThreadCardSkeleton,
} from "@/widgets/content-display/ContentDisplayCards";

interface SearchDiscoveryHubProps {
  channelId?: string | null;
  applyPreferences: boolean;
  onOpen: (thread: Thread) => void;
  onTagSelect: (tag: string) => void;
}

const railConfigs: Array<{
  key: DiscoveryRailKey;
  label: string;
}> = [
  {
    key: "latest",
    label: "上新",
  },
  {
    key: "reaction_surge",
    label: "热爱",
  },
  {
    key: "discussion_surge",
    label: "热议",
  },
  {
    key: "collection_surge",
    label: "珍藏",
  },
];

function getAuthorName(thread: Thread) {
  return (
    thread.author?.display_name ||
    thread.author?.global_name ||
    thread.author?.name ||
    "未知作者"
  );
}

export function SearchDiscoveryHub({
  channelId,
  applyPreferences,
  onOpen,
  onTagSelect,
}: SearchDiscoveryHubProps) {
  const [activeRail, setActiveRail] = useState<DiscoveryRailKey>("latest");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRollingTags, setIsRollingTags] = useState(false);
  const queryClient = useQueryClient();
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelTimerRef = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);
  const scope = channelId ? `channel:${channelId}` : "global";
  const [tagSelection, setTagSelection] = useState<{
    scope: string;
    tags: string[];
  }>({ scope: "", tags: [] });

  const railsQuery = useQuery({
    queryKey: ["search-discovery", "rails", applyPreferences],
    queryFn: () =>
      discoveryApi.getRails({
        limit: 8,
        days: 30,
        apply_preferences: applyPreferences,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const tagCatalogQuery = useQuery({
    queryKey: ["search-discovery", "tag-catalog", scope],
    queryFn: async () => {
      if (!channelId) return searchApi.getGlobalTags();
      const catalog = await searchApi.getChannelTagCatalog(channelId);
      return Array.from(
        new Set(
          catalog.flatMap((item) => [
            ...item.virtual_tags,
            ...item.available_tags,
          ]),
        ),
      );
    },
    staleTime: 30 * 60 * 1000,
  });

  const availableTags = useMemo(
    () => tagCatalogQuery.data || [],
    [tagCatalogQuery.data],
  );

  useEffect(() => {
    if (availableTags.length < 2) return;
    if (
      tagSelection.scope === scope &&
      tagSelection.tags.length === 2 &&
      tagSelection.tags.every((tag) => availableTags.includes(tag))
    ) {
      return;
    }
    const tags =
      getStoredDiscoveryTags(scope, availableTags) ||
      chooseDiscoveryTags(availableTags);
    saveDiscoveryTags(scope, tags);
    setTagSelection({ scope, tags });
  }, [availableTags, scope, tagSelection]);

  const selectedTags = tagSelection.scope === scope ? tagSelection.tags : [];
  const getTagThreads = async (tag: string) => {
    const response = await searchApi.search({
      limit: 8,
      channel_ids: channelId ? [channelId] : undefined,
      include_tags: [tag],
      sort_method: "created_desc",
      sort_order: "desc",
      apply_preferences: applyPreferences,
    });
    return (response.results || []) as Thread[];
  };
  const getTagThreadQueryKey = (tag: string) => [
    "search-discovery",
    "tag-threads",
    scope,
    tag,
    applyPreferences,
  ];
  const tagThreadQueries = useQueries({
    queries: selectedTags.map((tag) => ({
      queryKey: getTagThreadQueryKey(tag),
      queryFn: () => getTagThreads(tag),
      staleTime: 30 * 60 * 1000,
    })),
  });

  const activeConfig =
    railConfigs.find((config) => config.key === activeRail) || railConfigs[0];
  const railThreads = railsQuery.data?.[activeRail] || [];

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
        getWrappedCarouselIndex(current, direction, railThreads.length),
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
  }, [railThreads.length]);

  useEffect(
    () => () => {
      if (wheelTimerRef.current !== null) {
        window.clearTimeout(wheelTimerRef.current);
      }
    },
    [],
  );

  const moveCarousel = (direction: number) => {
    setActiveIndex((current) =>
      getWrappedCarouselIndex(current, direction, railThreads.length),
    );
  };

  const changeRail = (key: DiscoveryRailKey) => {
    setActiveRail(key);
    setActiveIndex(0);
  };

  const rollTags = async () => {
    const tags = chooseDiscoveryTags(availableTags, selectedTags);
    if (tags.length < 2) return;
    setIsRollingTags(true);
    try {
      await Promise.all(
        tags.map((tag) =>
          queryClient.fetchQuery({
            queryKey: getTagThreadQueryKey(tag),
            queryFn: () => getTagThreads(tag),
            staleTime: 30 * 60 * 1000,
          }),
        ),
      );
      saveDiscoveryTags(scope, tags);
      setTagSelection({ scope, tags });
    } finally {
      setIsRollingTags(false);
    }
  };

  return (
    <div className="mb-10 flex flex-col gap-10">
      <section className="py-6 sm:py-8">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div
            role="tablist"
            aria-label="切换发现轨道"
            className="inline-flex max-w-full items-center gap-7 overflow-x-auto px-2"
          >
            {railConfigs.map((config) => (
              <button
                key={config.key}
                type="button"
                role="tab"
                onClick={() => changeRail(config.key)}
                aria-selected={activeRail === config.key}
                className={`relative shrink-0 py-2 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:mx-auto after:h-0.5 after:rounded-full after:transition-all ${
                  activeRail === config.key
                    ? "text-(--od-accent) after:w-full after:bg-(--od-accent)"
                    : "text-(--od-text-secondary) after:w-0 hover:text-(--od-text-primary)"
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {railsQuery.isLoading ? (
          <div className="mx-auto mt-8 h-[clamp(20rem,30vw,29rem)] w-[68%] max-w-3xl animate-pulse rounded-3xl bg-(--od-surface-input)" />
        ) : railThreads.length > 0 ? (
          <div
            ref={carouselRef}
            role="region"
            aria-label={`${activeConfig.label}发现轨道，可滚轮或左右滑动`}
            onPointerDown={(event) => {
              pointerStartXRef.current = event.clientX;
              swipeHandledRef.current = false;
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={(event) => {
              if (pointerStartXRef.current === null) return;
              const distance = event.clientX - pointerStartXRef.current;
              pointerStartXRef.current = null;
              if (Math.abs(distance) >= 42) {
                swipeHandledRef.current = true;
                moveCarousel(distance < 0 ? 1 : -1);
              }
            }}
            onPointerCancel={() => {
              pointerStartXRef.current = null;
            }}
            className="relative mx-auto mt-8 h-[clamp(20rem,30vw,29rem)] max-w-7xl touch-pan-y overflow-hidden select-none"
          >
            {railThreads.map((thread, index) => {
              let offset = index - activeIndex;
              if (offset > railThreads.length / 2) offset -= railThreads.length;
              if (offset < -railThreads.length / 2)
                offset += railThreads.length;
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
                          <Sparkles className="h-10 w-10 text-(--od-text-tertiary)" />
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-4 block text-center transition-opacity duration-500 ${
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
                          isActive
                            ? "opacity-100"
                            : "pointer-events-none opacity-0"
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
        ) : (
          <p className="py-16 text-center text-sm text-(--od-text-tertiary)">
            这条发现轨道暂时没有内容。
          </p>
        )}

        {railThreads.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2">
            {railThreads.map((thread, index) => (
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
      </section>

      {selectedTags.length === 2 && (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-(--od-text-primary)">
                从一个标签开始
              </h2>
              <p className="mt-1 text-xs text-(--od-text-tertiary)">
                两个随机入口会留在这里，直到你主动换一组。
              </p>
            </div>
            <button
              type="button"
              onClick={rollTags}
              disabled={isRollingTags}
              className="od-inline-action od-inline-action-ghost"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRollingTags ? "animate-spin" : ""}`}
              />
              换两个标签
            </button>
          </div>

          <div className="flex flex-col gap-9">
            {selectedTags.map((tag, tagIndex) => {
              const query = tagThreadQueries[tagIndex];
              return (
                <div key={`tag-slot-${tagIndex}`}>
                  <button
                    type="button"
                    onClick={() => onTagSelect(tag)}
                    className="mb-3 inline-flex items-center gap-2 text-left text-base font-semibold text-(--od-text-primary) transition-colors hover:text-(--od-accent)"
                  >
                    <span className="text-(--od-accent)">#</span>
                    {tag}
                  </button>
                  {query?.isLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <CompactThreadCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : query?.data?.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                      {query.data.slice(0, 8).map((thread) => (
                        <CompactThreadCard
                          key={thread.thread_id}
                          thread={thread}
                          onOpen={onOpen}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-sm text-(--od-text-tertiary)">
                      这个标签暂时没有抽到可展示的作品。
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
