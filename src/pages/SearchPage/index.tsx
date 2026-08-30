import { ThreadCardSkeleton } from "@/entities/thread/ThreadCardSkeleton";
import { useInfiniteScrollTrigger } from "@/shared/hooks/useInfiniteScrollTrigger";
import { ThreadListItemSkeleton } from "@/entities/thread/ThreadListItemSkeleton";
import { ThreadResultsCollection } from "@/features/threads/components/ThreadResultsCollection";
import { BooklistCard } from "@/entities/booklist/BooklistCard";
import { BooklistListItem } from "@/entities/booklist/BooklistListItem";
import { TournamentListItem } from "@/features/tournaments/components/TournamentListItem";
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
import { useListEntranceAnimation } from "@/shared/hooks/useListEntranceAnimation";
import { useMascotStore } from "@/features/mascot/store/mascotStore";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { PreferenceFilterNotice } from "@/features/preferences/components/PreferenceFilterNotice";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { useChannels } from "@/shared/hooks/useChannels";
import {
  addToken,
  parseSearchQuery,
  tokenizeSearchPayload,
} from "@/shared/lib/searchTokenizer";
import { Select } from "@/shared/ui/Select";
import { AnimatedPagination } from "@/shared/ui/AnimatedPagination";
import {
  buildYesterdayPopularQuery,
  YESTERDAY_POPULAR_LABEL,
} from "@/features/search/lib/searchPresets";
import { scrollPageToTop } from "@/shared/lib/pageScroll";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";
import {
  ArrowUpDown,
  Clock3,
  MoveDown,
  MoveUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

const searchSortOptions = [
  { value: "last_active_desc", label: "最近活跃" },
  { value: "created_desc", label: "最新发布" },
  { value: "reply_desc", label: "回复数" },
  { value: "reaction_desc", label: "反应数" },
  { value: "relevance", label: "相关度" },
];

function SearchRateLimitNotice({
  remaining,
  compact = false,
}: {
  remaining: number | null;
  compact?: boolean;
}) {
  const message =
    remaining === null
      ? "搜索有点频繁，请稍后再试。"
      : `搜索有点频繁，请在 ${remaining} 秒后再试。`;

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-sm text-(--od-text-secondary)"
        role="status"
      >
        <Clock3 className="h-4 w-4 shrink-0 text-amber-500" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      role="status"
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
        <Clock3 className="h-10 w-10" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
        搜索有点频繁
      </h3>
      <p className="text-(--od-text-secondary)">{message}</p>
    </div>
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const { params, setParams } = useSearchURLParams();
  const { query, channel: selectedChannel, page: currentSearchPage } = params;
  const isThreadTab = params.type === "thread";
  const isTournamentTab = params.type === "tournament";
  const collectionKeywords = useMemo(
    () => tokenizeSearchPayload(query).text,
    [query],
  );

  const { preferences, isLoading: arePreferencesLoading } = useUserPreferences({
    guildId: GUILD_ID,
  });
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

  const {
    discoveryPreferenceContext,
    hasSearchFilters,
    ignoreDiscoveryPreferences,
    isPreferenceActive,
    queryState: { isLoading: isResultsLoading, isError, refetch },
    infiniteQueryState,
    loadedPageCount,
    preparePageRequest,
    results,
    pageSize,
    pageByThreadId,
    requestNextPage,
    reportViewedPage,
    viewedPage,
    setIgnoreDiscoveryPreferences,
    totalResults,
    visibleRateLimit,
  } = useSearchResults({
    params,
    preferences,
    enabled: isThreadTab && !arePreferencesLoading,
  });
  const isLoading =
    isResultsLoading || (isThreadTab && arePreferencesLoading);

  const animateIn = useListEntranceAnimation(isLoading);

  const booklistQuery = useBooklistsList({
    scope: "public",
    keywords: collectionKeywords || undefined,
    sortMethod: 3,
    pageIndex: params.page - 1,
    pageSize: 12,
    isTournament: isTournamentTab,
    enabled: !isThreadTab,
  });

  const booklistResults = booklistQuery.data?.results ?? [];
  const booklistTotal = booklistQuery.data?.total ?? 0;
  const booklistPageSize = booklistQuery.data?.limit ?? 12;
  const booklistTotalPages = Math.max(1, Math.ceil(booklistTotal / booklistPageSize));
  const searchTotalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const isInfiniteMode = resultPagingMode === "infinite";
  const loadMoreRef = useInfiniteScrollTrigger({
    hasNextPage: infiniteQueryState.hasNextPage,
    isFetchingNextPage: infiniteQueryState.isFetchingNextPage,
    isFetchNextPageError: infiniteQueryState.isFetchNextPageError,
    fetchNextPage: requestNextPage,
  }, {
    rootMargin: "360px",
    enabled: isInfiniteMode,
  });
  useSearchWhisper(query);

  const prevChannelRef = useRef<string | undefined>(params.channel);
  const prevQueryRef = useRef<string | undefined>(params.query);
  const prevSortRef = useRef<string | undefined>(params.sortMethod);
  const prevTypeRef = useRef<string | undefined>(params.type);
  const isInitialMountRef = useRef(true);

  // 仅在用户主动切换频道、修改搜索词或排序时平滑回顶
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const channelChanged = prevChannelRef.current !== params.channel;
    const queryChanged = prevQueryRef.current !== params.query;
    const sortChanged = prevSortRef.current !== params.sortMethod;
    const typeChanged = prevTypeRef.current !== params.type;

    prevChannelRef.current = params.channel;
    prevQueryRef.current = params.query;
    prevSortRef.current = params.sortMethod;
    prevTypeRef.current = params.type;

    if (channelChanged || queryChanged || sortChanged || typeChanged) {
      scrollPageToTop("auto");
    }
  }, [params.channel, params.query, params.sortMethod, params.type]);

  useEffect(() => {
    if (
      !isInfiniteMode ||
      !visibleRateLimit ||
      loadedPageCount === 0 ||
      currentSearchPage <= loadedPageCount
    )
      return;
    setParams({ page: loadedPageCount });
  }, [currentSearchPage, loadedPageCount, setParams, visibleRateLimit, isInfiniteMode]);

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
  const threadGridClass = gridClass;
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

  // 动态同步当前页码到右下角浮动球
  useEffect(() => {
    const totalPages = isThreadTab ? searchTotalPages : booklistTotalPages;
    const currentPage = isThreadTab
      ? isInfiniteMode
        ? viewedPage
        : params.page || 1
      : params.page || 1;

    if (totalPages > 1) {
      window.dispatchEvent(
        new CustomEvent("odysseia:active-page-info", {
          detail: { currentPage, totalPages },
        }),
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("odysseia:active-page-info", {
          detail: null,
        }),
      );
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent("odysseia:active-page-info", {
          detail: null,
        }),
      );
    };
  }, [
    params.page,
    searchTotalPages,
    booklistTotalPages,
    isThreadTab,
    isInfiniteMode,
    viewedPage,
  ]);

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
        <div className="od-page-heading mb-6 flex min-w-0 max-w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-tour="search-header" className="flex min-w-0 items-center justify-center text-center sm:justify-start sm:text-left">
            <div className="min-w-0">
              <h1 className="od-page-title flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
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
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-sm text-(--od-text-secondary) sm:justify-start">
                <span>
                  找到 {isThreadTab ? totalResults : booklistTotal} 条结果
                </span>
                {isThreadTab && results.length > 0 && (
                  <>
                    <span className="opacity-30">•</span>
                    <span>已加载 {results.length} 条</span>
                  </>
                )}
                {isThreadTab && selectedChannelName && (
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

          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 sm:justify-end sm:[&>*+*]:border-l sm:[&>*+*]:border-(--od-divider)/45 sm:[&>*+*]:pl-3">
            <div
              data-tour="search-type-toggle"
              className="inline-flex min-h-10 w-full items-center justify-center gap-1 sm:w-auto"
            >
              <button
                type="button"
                onClick={() => setParams({ type: "thread" })}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  params.type === "thread"
                    ? "bg-(--od-accent)/10 text-(--od-accent)"
                    : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                }`}
              >
                帖子
              </button>
              <button
                type="button"
                onClick={() => setParams({ type: "booklist" })}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  params.type === "booklist"
                    ? "bg-(--od-accent)/10 text-(--od-accent)"
                    : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                }`}
              >
                书单
              </button>
              <button
                type="button"
                onClick={() => setParams({ type: "tournament" })}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  params.type === "tournament"
                    ? "bg-(--od-accent)/10 text-(--od-accent)"
                    : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                }`}
              >
                赛事
              </button>
            </div>

            {isThreadTab && (
              <div className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-medium text-(--od-text-secondary)">
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

        {isThreadTab && (
          <div className="mb-5 flex items-center gap-2 px-1 text-xs text-(--od-text-tertiary)">
            <span>不知道搜什么？</span>
            <button
              type="button"
              onClick={() => setParams({ query: buildYesterdayPopularQuery(), page: 1 })}
              className="text-(--od-accent) transition-colors hover:text-(--od-text-primary) hover:underline"
            >
              {YESTERDAY_POPULAR_LABEL}
            </button>
          </div>
        )}

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
                    ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : threadGridClass
              }
            >
              {Array.from({ length: 8 }).map((_, index) =>
                layoutMode === "list" ? (
                  <ThreadListItemSkeleton key={index} />
                ) : layoutMode === "masonry" ? (
                  <div key={index} className="mb-4 break-inside-avoid">
                    <ThreadCardSkeleton />
                  </div>
                ) : (
                  <ThreadCardSkeleton key={index} />
                ),
              )}
            </div>
          ) : isError && !infiniteQueryState.data ? (
            visibleRateLimit ? (
              <SearchRateLimitNotice remaining={visibleRateLimit.remaining} />
            ) : (
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
            )
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-6">
              {visibleRateLimit && (
                <SearchRateLimitNotice
                  remaining={visibleRateLimit.remaining}
                  compact
                />
              )}
              <ThreadResultsCollection
                threads={results}
                onTagClick={handleTagClick}
                searchQuery={query}
                onAuthorClick={handleAuthorClick}
                onPreview={openPreview}
                gridClassName={threadGridClass}
                listClassName="flex flex-col space-y-od-list-gap pb-4"
                layoutMode={layoutMode}
                animateIn={animateIn}
                pageByThreadId={isInfiniteMode ? pageByThreadId : undefined}
                onViewedPageChange={isInfiniteMode ? reportViewedPage : undefined}
              />

              {isInfiniteMode ? (
                <div
                  ref={loadMoreRef}
                  className="flex justify-center py-8 text-sm text-(--od-text-secondary)"
                >
                  {infiniteQueryState.isFetchNextPageError ? (
                    <button
                      type="button"
                      onClick={requestNextPage}
                      className="rounded-full border border-(--od-border) px-4 py-2 text-(--od-accent) hover:bg-(--od-bg-secondary)"
                    >
                      加载失败，点击重试
                    </button>
                  ) : infiniteQueryState.isFetchingNextPage
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
                  onChange={(page) => {
                    if (preparePageRequest(page)) setParams({ page });
                  }}
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
              {isTournamentTab ? "赛事搜索出错了" : "书单搜索出错了"}
            </h3>
            <p className="mb-6 text-(--od-text-secondary)">
              暂时拉不到{isTournamentTab ? "赛事" : "书单"}结果，稍后再试试吧。
            </p>
            <button
              onClick={() => booklistQuery.refetch()}
              className="od-inline-action od-inline-action-primary px-6 py-3 text-sm"
            >
              重试搜索
            </button>
          </div>
        ) : booklistResults.length > 0 ? (
          <div className="flex flex-col gap-6">
            <div
              className={
                layoutMode === "list"
                  ? "flex flex-col space-y-od-list-gap"
                  : gridClass
              }
            >
              {booklistResults.map((booklist) => {
                if (isTournamentTab && layoutMode === "list") {
                  return (
                    <TournamentListItem
                      key={booklist.id}
                      tournament={booklist}
                      onOpen={(tournament) => navigate(`/tournaments/${tournament.id}`)}
                      onToggleCollect={(item) =>
                        collectBooklistMutation.mutate({
                          id: item.id,
                          collected: Boolean(item.collected_flag),
                        })
                      }
                      collectLoading={collectBooklistMutation.isPending}
                    />
                  );
                }

                const commonProps = {
                  booklist,
                  canManage: false,
                  onOpen: (id: number) => navigate(
                    isTournamentTab ? `/tournaments/${id}` : `/booklists/${id}`,
                  ),
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
            <AnimatedPagination
              currentPage={params.page}
              totalPages={booklistTotalPages}
              totalItems={booklistTotal}
              onChange={(page) => setParams({ page })}
            />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-(--od-text-tertiary) opacity-20">
              <Search className="mx-auto h-24 w-24" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
              没有找到匹配{isTournamentTab ? "赛事" : "书单"}
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
