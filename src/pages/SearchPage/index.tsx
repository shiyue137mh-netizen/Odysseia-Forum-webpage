import { ThreadCardSkeleton } from "@/entities/thread/ThreadCardSkeleton";
import { useInfiniteScrollTrigger } from "@/shared/hooks/useInfiniteScrollTrigger";
import { ThreadListItemSkeleton } from "@/entities/thread/ThreadListItemSkeleton";
import { ThreadResultsCollection } from "@/entities/thread/ThreadResultsCollection";
import { BooklistCard } from "@/entities/booklist/BooklistCard";
import { BooklistListItem } from "@/entities/booklist/BooklistListItem";
import { useSearchWhisper } from "@/features/easter-eggs/hooks/useSearchWhisper";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import { SearchDiscoveryHub } from "@/features/search/components/SearchDiscoveryHub";
import {
  getSearchTagLogicPreference,
  useSearchURLParams,
} from "@/features/search/hooks/useSearchParams";
import { useSearchResults } from "@/features/search/hooks/useSearchResults";
import {
  useBooklistsList,
  useToggleBooklistCollection,
} from "@/features/booklists/hooks/useBooklistsData";
import {
  useCardGridClass,
  useResultPagingModeSetting,
  useSettings,
} from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { useMascotStore } from "@/features/mascot/store/mascotStore";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { PreferenceFilterNotice } from "@/features/preferences/components/PreferenceFilterNotice";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { useChannels } from "@/shared/hooks/useChannels";
import { addToken, parseSearchQuery } from "@/shared/lib/searchTokenizer";
import { FluidDivider } from "@/shared/ui/FluidDivider";
import { Select } from "@/shared/ui/Select";
import { AnimatedPagination } from "@/shared/ui/AnimatedPagination";
import { scrollPageToTop } from "@/shared/lib/pageScroll";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";
import {
  ArrowUpDown,
  Compass,
  MoveDown,
  MoveUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const searchSortOptions = [
  { value: "last_active_desc", label: "最近活跃" },
  { value: "created_desc", label: "最新发布" },
  { value: "reply_desc", label: "回复数" },
  { value: "reaction_desc", label: "反应数" },
  { value: "relevance", label: "相关度" },
];

export function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { params, setParams } = useSearchURLParams();
  const { query, channel: selectedChannel } = params;

  const { preferences } = useUserPreferences({ guildId: GUILD_ID });
  const collectBooklistMutation = useToggleBooklistCollection();
  const { data: channelsData } = useChannels();
  const { openPreview } = usePreviewThread();
  const reactToSearch = useMascotStore((state) => state.reactToSearch);

  const { settings } = useSettings();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "search",
    settings.layoutMode,
  );
  const resultPagingMode = useResultPagingModeSetting();
  const hasTriggeredSearchCueRef = useRef<string | null>(null);
  const lastSearchLocationRef = useRef<string | null>(null);

  const {
    discoveryPreferenceContext,
    hasSearchFilters,
    ignoreDiscoveryPreferences,
    isPreferenceActive,
    queryState: { isLoading, isError, refetch },
    infiniteQueryState,
    results,
    pageSize,
    setIgnoreDiscoveryPreferences,
    totalResults,
  } = useSearchResults({ params, preferences });

  const booklistQuery = useBooklistsList({
    scope: "public",
    keywords: query || undefined,
    sortMethod: 3,
    pageIndex: 0,
    pageSize: 12,
  });

  const booklistResults = booklistQuery.data?.results ?? [];
  const booklistTotal = booklistQuery.data?.total ?? 0;
  const searchTotalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const isInfiniteMode = resultPagingMode === "infinite";
  const loadMoreRef = useInfiniteScrollTrigger(infiniteQueryState, {
    rootMargin: "360px",
    enabled: isInfiniteMode,
  });
  useSearchWhisper(query);

  useEffect(() => {
    const searchLocation = `${location.pathname}?${location.search}`;

    if (lastSearchLocationRef.current === null) {
      lastSearchLocationRef.current = searchLocation;
      return;
    }

    if (lastSearchLocationRef.current === searchLocation) return;
    lastSearchLocationRef.current = searchLocation;

    scrollPageToTop("auto");
    const frame = window.requestAnimationFrame(() => scrollPageToTop("auto"));
    let attempts = 0;
    const interval = window.setInterval(() => {
      scrollPageToTop("auto");
      attempts += 1;
      if (attempts >= 6) window.clearInterval(interval);
    }, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [location.pathname, location.search]);

  // 这些回调会传给 memo 化的 ThreadResultsCollection / ThreadCard，
  // 必须保持引用稳定，否则任何一次页面重渲染都会击穿整个列表的 memo。
  const handleTagClick = useCallback(
    (tagName: string) => {
      const nextQuery = addToken(query || "", "tag", tagName, "include");
      setParams({ query: nextQuery });
    },
    [query, setParams],
  );

  const handleAuthorClick = useCallback(
    (author: { id: string; name: string }) => {
      navigate(`/u/${author.id}`);
    },
    [navigate],
  );

  const gridClass = useCardGridClass();
  const threadGridClass =
    "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4";
  const selectedChannelName =
    channelsData?.channels.find((channel) => channel.id === selectedChannel)
      ?.name || null;

  useEffect(() => {
    if (isLoading) return;

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      hasTriggeredSearchCueRef.current = null;
      return;
    }

    const cueKey = `${normalizedQuery}::${totalResults}::${isError ? "error" : "ok"}`;
    if (hasTriggeredSearchCueRef.current === cueKey) return;

    if (isError) {
      hasTriggeredSearchCueRef.current = cueKey;
      return;
    }

    reactToSearch(totalResults > 0 ? "found" : "empty", normalizedQuery);
    hasTriggeredSearchCueRef.current = cueKey;
  }, [isError, isLoading, query, reactToSearch, totalResults]);

  // 标题栏与偏好同步共用的解析结果，按 query 缓存
  const queryTokens = useMemo(() => parseSearchQuery(query), [query]);

  // 同步用户偏好排序
  useEffect(() => {
    const hasTextSearch = queryTokens.some(
      (token) => token.type === "text" && token.value.trim(),
    );
    if (
      !hasTextSearch &&
      preferences?.sort_method &&
      !new URLSearchParams(window.location.search).get("sort")
    ) {
      const sortMap: Record<string, typeof params.sortMethod> = {
        comprehensive: "relevance",
        last_active: "last_active_desc",
        created_at: "created_desc",
        reply_count: "reply_desc",
        reaction_count: "reaction_desc",
      };
      const preferredSort = sortMap[preferences.sort_method];
      if (preferredSort && preferredSort !== params.sortMethod) {
        setParams({ sortMethod: preferredSort });
      }
    }
  }, [preferences, params.sortMethod, queryTokens, setParams]);


  const isThreadTab = params.type === "thread";
  const showDiscoveryHub =
    isThreadTab &&
    !params.query.trim() &&
    params.includeTags.length === 0 &&
    params.excludeTags.length === 0 &&
    params.includeAuthors.length === 0 &&
    params.excludeAuthors.length === 0 &&
    !params.timeFrom &&
    !params.timeTo &&
    params.reactionMin === null &&
    params.replyMin === null;

  return (
    <div className="flex min-h-full min-w-0 max-w-full flex-col overflow-x-clip">
      <div className="min-w-0 max-w-full flex-1 overflow-x-clip p-4 animate-in fade-in duration-500 sm:p-6 lg:p-8">
        <FluidDivider label="Search" tone="strong" className="mb-6" />
        <div className="mb-6 flex min-w-0 max-w-full flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div data-tour="search-header" className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--od-surface-soft) text-(--od-accent)">
              <Compass className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-bold tracking-tight text-(--od-text-primary)">
                {query ? (
                  <>
                    <span>搜索:</span>
                    {queryTokens.map((token, i) => {
                      if (token.type === "text") {
                        return (
                          <span
                            key={i}
                            className="truncate max-w-[200px] sm:max-w-md"
                          >
                            {token.value}
                          </span>
                        );
                      }

                      const isNegative = token.mode === "exclude";
                      const colorClass = isNegative
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "bg-[color-mix(in_srgb,var(--od-accent)_16%,transparent)] text-(--od-accent) border border-[color-mix(in_srgb,var(--od-accent)_26%,transparent)]";

                      const prefix =
                        token.type === "author"
                          ? "@"
                          : token.type === "channel"
                            ? "#"
                            : "";

                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-base font-medium ${colorClass}`}
                        >
                          {isNegative && "-"}
                          {prefix}
                          {token.value}
                        </span>
                      );
                    })}
                  </>
                ) : (
                  "探索社区"
                )}
              </h1>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-(--od-text-secondary)">
                <span>
                  找到 {isThreadTab ? totalResults : booklistTotal} 条结果
                </span>
                {isThreadTab && results.length > 0 && (
                  <>
                    <span className="opacity-30">•</span>
                    <span>已加载 {results.length} 条</span>
                  </>
                )}
                {selectedChannelName && (
                  <>
                    <span className="opacity-30">•</span>
                    <span>频道 {selectedChannelName}</span>
                  </>
                )}
                {isPreferenceActive && (
                  <>
                    <span className="opacity-30">•</span>
                    <span>已按偏好展示</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <div
              data-tour="search-type-toggle"
              className="inline-flex items-center gap-1 rounded-full border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_76%,transparent)] p-1"
            >
              <button
                type="button"
                onClick={() => setParams({ type: "thread" })}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  params.type === "thread"
                    ? "bg-(--od-accent) text-white"
                    : "text-(--od-text-secondary) hover:text-(--od-text-primary)"
                }`}
              >
                帖子
              </button>
              <button
                type="button"
                onClick={() => setParams({ type: "booklist" })}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  params.type === "booklist"
                    ? "bg-(--od-accent) text-white"
                    : "text-(--od-text-secondary) hover:text-(--od-text-primary)"
                }`}
              >
                书单
              </button>
            </div>

            {isThreadTab && (
              <div className="inline-flex items-center gap-2 rounded-full border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_76%,transparent)] px-3 py-2 text-xs font-medium text-(--od-text-secondary)">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <Select
                  aria-label="选择排序方式"
                  value={params.sortMethod}
                  options={searchSortOptions}
                  onChange={(v) =>
                    setParams({
                      sortMethod: v as typeof params.sortMethod,
                    })
                  }
                  variant="inline"
                />
                <button
                  type="button"
                  onClick={() =>
                    setParams({
                      sortOrder: params.sortOrder === "desc" ? "asc" : "desc",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-hover) hover:text-(--od-text-primary)"
                  title={
                    params.sortOrder === "desc" ? "当前为倒序" : "当前为正序"
                  }
                >
                  {params.sortOrder === "desc" ? (
                    <MoveDown className="h-3.5 w-3.5" />
                  ) : (
                    <MoveUp className="h-3.5 w-3.5" />
                  )}
                  {params.sortOrder === "desc" ? "倒序" : "正序"}
                </button>
              </div>
            )}

            <LayoutModeToggle
              value={
                !isThreadTab && layoutMode === "masonry" ? "grid" : layoutMode
              }
              onChange={setLayoutMode}
              showMasonry={isThreadTab}
            />

            {isThreadTab && hasSearchFilters && (
              <button
                onClick={() => {
                  setParams({
                    query: "",
                    sortMethod: "last_active_desc",
                    sortOrder: "desc",
                    page: 1,
                    tagLogic: getSearchTagLogicPreference(),
                  });
                }}
                className="od-inline-action od-inline-action-soft"
              >
                清除所有筛选
              </button>
            )}
          </div>
        </div>

        {isThreadTab && discoveryPreferenceContext && (
          <section className="mb-7 px-1">
            <PreferenceFilterNotice
              ignored={ignoreDiscoveryPreferences}
              onIgnore={() => setIgnoreDiscoveryPreferences(true)}
              onRestore={() => setIgnoreDiscoveryPreferences(false)}
              onOpenSettings={() => navigate("/me?tab=preferences")}
            />
          </section>
        )}

        {showDiscoveryHub && (
          <SearchDiscoveryHub
            channelId={selectedChannel}
            applyPreferences={!ignoreDiscoveryPreferences}
            onOpen={openPreview}
            onTagSelect={handleTagClick}
          />
        )}

        {isThreadTab ? (
          isLoading ? (
            <div
              className={
                layoutMode === "list"
                  ? "flex flex-col space-y-od-list-gap"
                  : layoutMode === "masonry"
                    ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                    : threadGridClass
              }
            >
              {Array.from({ length: 8 }).map((_, index) =>
                layoutMode === "list" ? (
                  <ThreadListItemSkeleton key={index} />
                ) : layoutMode === "masonry" ? (
                  <div key={index} className="mb-4 break-inside-avoid">
                    <ThreadCardSkeleton hideBottomDivider />
                  </div>
                ) : (
                  <ThreadCardSkeleton key={index} />
                ),
              )}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <SlidersHorizontal className="h-10 w-10" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
                搜索出错了
              </h3>
              <p className="mb-6 text-(--od-text-secondary)">
                暂时拉不到结果，稍后再试试吧。
              </p>
              <button
                onClick={() => refetch()}
                className="od-inline-action od-inline-action-primary px-6 py-3 text-sm"
              >
                重试搜索
              </button>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-6">
              <ThreadResultsCollection
                threads={results}
                onTagClick={handleTagClick}
                searchQuery={query}
                onAuthorClick={handleAuthorClick}
                onPreview={openPreview}
                gridClassName={threadGridClass}
                listClassName="flex flex-col space-y-od-list-gap pb-4"
                layoutMode={layoutMode}
              />

              {isInfiniteMode ? (
                <div
                  ref={loadMoreRef}
                  className="flex justify-center py-8 text-sm text-(--od-text-secondary)"
                >
                  {infiniteQueryState.isFetchingNextPage
                    ? "正在加载更多帖子..."
                    : infiniteQueryState.hasNextPage
                      ? "继续向下滚动加载更多"
                      : "已经到底啦"}
                </div>
              ) : (
                <AnimatedPagination
                  currentPage={params.page}
                  totalPages={searchTotalPages}
                  totalItems={totalResults}
                  onChange={(page) => setParams({ page })}
                />
              )}
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-(--od-text-tertiary) opacity-20">
                <Search className="mx-auto h-24 w-24" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
                {hasSearchFilters
                  ? "没有找到匹配的结果"
                  : "开始你的探索之旅吧～"}
              </h3>
              <p className="text-(--od-text-secondary)">
                {hasSearchFilters
                  ? "试试换个关键词，或者清掉筛选条件看看"
                  : "在上面搜索框输入内容，或从侧边栏选个频道开始"}
              </p>
            </div>
          )
        ) : booklistQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-[1.35rem] bg-[color-mix(in_srgb,var(--od-surface-content)_62%,transparent)]"
              />
            ))}
          </div>
        ) : booklistQuery.isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <SlidersHorizontal className="h-10 w-10" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
              书单搜索出错了
            </h3>
            <p className="mb-6 text-(--od-text-secondary)">
              暂时拉不到书单结果，稍后再试试吧。
            </p>
            <button
              onClick={() => booklistQuery.refetch()}
              className="od-inline-action od-inline-action-primary px-6 py-3 text-sm"
            >
              重试搜索
            </button>
          </div>
        ) : booklistResults.length > 0 ? (
          <div
            className={
              layoutMode === "list"
                ? "flex flex-col space-y-od-list-gap"
                : gridClass
            }
          >
            {booklistResults.map((booklist) => {
              const commonProps = {
                booklist,
                canManage: false,
                onOpen: (id: number) => navigate(`/booklists/${id}`),
                onToggleCollect: (item: typeof booklist) =>
                  collectBooklistMutation.mutate({
                    id: item.id,
                    collected: Boolean(item.collected_flag),
                  }),
                onEdit: () => undefined,
                onDelete: () => undefined,
                collectLoading: collectBooklistMutation.isPending,
              };

              return layoutMode === "list" ? (
                <BooklistListItem
                  key={booklist.id}
                  {...commonProps}
                  ownerName={
                    booklist.author?.display_name ||
                    booklist.author?.global_name ||
                    booklist.author?.name ||
                    undefined
                  }
                  ownerAvatarUrl={booklist.author?.avatar_url ?? null}
                  coverImageUrl={booklist.cover_image_url || null}
                />
              ) : (
                <BooklistCard key={booklist.id} {...commonProps} />
              );
            })}
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-(--od-text-tertiary) opacity-20">
              <Search className="mx-auto h-24 w-24" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
              没有找到匹配书单
            </h3>
            <p className="text-(--od-text-secondary)">
              试试换个关键词，或者切回帖子分类继续探索。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
