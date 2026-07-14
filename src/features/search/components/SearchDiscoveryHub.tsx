import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Thread } from "@/entities/thread/types";
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
import { DiscoveryThreadCarousel } from "@/features/discovery/components/DiscoveryThreadCarousel";
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

export function SearchDiscoveryHub({
  channelId,
  applyPreferences,
  onOpen,
  onTagSelect,
}: SearchDiscoveryHubProps) {
  const [activeRail, setActiveRail] = useState<DiscoveryRailKey>("latest");
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState("30");
  const [isRollingTags, setIsRollingTags] = useState(false);
  const queryClient = useQueryClient();
  const daysPanelRef = useRef<HTMLDetailsElement>(null);
  const scope = channelId ? `channel:${channelId}` : "global";
  const [tagSelection, setTagSelection] = useState<{
    scope: string;
    tags: string[];
  }>({ scope: "", tags: [] });

  const railsQuery = useQuery({
    queryKey: ["search-discovery", "rails", days, applyPreferences],
    queryFn: () =>
      discoveryApi.getRails({
        limit: 8,
        days,
        apply_preferences: applyPreferences,
      }),
    placeholderData: (previousData) => previousData,
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

  const changeRail = (key: DiscoveryRailKey) => {
    setActiveRail(key);
  };

  const applyDays = (nextDays: number) => {
    const normalizedDays = Math.max(1, Math.min(365, Math.round(nextDays)));
    setDays(normalizedDays);
    setCustomDays(String(normalizedDays));
    if (daysPanelRef.current) daysPanelRef.current.open = false;
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
    <div className="mb-10 flex min-w-0 max-w-full flex-col gap-10 overflow-x-clip">
      <section className="min-w-0 max-w-full py-6 sm:py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-center">
          <div
            role="tablist"
            aria-label="切换发现轨道"
            className="inline-flex max-w-full items-center gap-7 overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

          <details ref={daysPanelRef} className="group relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary) [&::-webkit-details-marker]:hidden">
              <CalendarRange className="h-3.5 w-3.5" />
              近 {days} 天
            </summary>
            <div className="absolute left-1/2 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-(--od-shell-line) bg-(--od-surface-floating) p-3 text-left shadow-(--od-shadow-medium) backdrop-blur-[var(--od-glass-blur)]">
              <p className="mb-2 text-[11px] font-semibold text-(--od-text-secondary)">
                榜单统计范围
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 7, 30, 90].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyDays(value)}
                    className={`rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                      days === value
                        ? "bg-(--od-accent) text-white"
                        : "bg-(--od-surface-input) text-(--od-text-secondary) hover:text-(--od-text-primary)"
                    }`}
                  >
                    {value} 天
                  </button>
                ))}
              </div>
              <form
                className="mt-3 flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyDays(Number(customDays) || 30);
                }}
              >
                <input
                  type="number"
                  min="1"
                  max="365"
                  inputMode="numeric"
                  value={customDays}
                  onChange={(event) => setCustomDays(event.target.value)}
                  aria-label="自定义榜单统计天数"
                  className="min-w-0 flex-1 rounded-lg border border-(--od-shell-line) bg-(--od-surface-input) px-2.5 py-1.5 text-xs text-(--od-text-primary) outline-hidden focus:border-(--od-accent)"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-(--od-accent) px-3 py-1.5 text-xs font-semibold text-white"
                >
                  应用
                </button>
              </form>
            </div>
          </details>
        </div>

        <DiscoveryThreadCarousel
          threads={railThreads}
          loading={railsQuery.isLoading}
          ariaLabel={`${activeConfig.label}发现轨道，可滚轮或左右滑动`}
          onOpen={onOpen}
        />
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
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <CompactThreadCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : query?.data?.length ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-8">
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
