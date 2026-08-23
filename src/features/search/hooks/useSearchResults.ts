import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

import type { SearchResponse, Thread } from '@/entities/thread/types';
import { searchApi } from '@/features/search/api/searchApi';
import {
  getDiscoveryPreferenceContext,
} from '@/features/preferences/lib/discoveryPreferences';
import type { UserPreferencesResponse } from '@/features/preferences/api/preferencesApi';
import {
  DEFAULT_TAG_LOGIC,
  type SearchParams,
} from '@/features/search/hooks/useSearchParams';
import { searchKeys } from '@/features/search/lib/queryKeys';
import { SEARCH_SUBMIT_EVENT } from '@/features/search/lib/searchEvents';
import {
  getActiveRateLimit,
  getRateLimitInfo,
  getRemainingRateLimitSeconds,
  type RateLimitInfo,
  type RateLimitOrigin,
} from '@/shared/api/rateLimit';
import {
  useResultPagingModeSetting,
  useResultPreloadSettings,
} from '@/shared/hooks/useSettings';
import { notifyRateLimit } from '@/features/mascot/lib/notify';

interface UseSearchResultsOptions {
  params: SearchParams;
  preferences: UserPreferencesResponse | null | undefined;
  enabled?: boolean;
}

const PAGE_SIZE = 24;

// 搜索是全站最重的接口。此前是 staleTime: 0 且每次挂载都 resetQueries，
// 等于每次进入页面、每次返回都要全量重拉一遍。
const RESULTS_STALE_TIME = 60 * 1000;

const collectThreadIds = (pages: (SearchResponse | undefined)[]) =>
  new Set(
    pages.flatMap((pageData) =>
      ((pageData?.results || []) as Thread[]).map((thread) => String(thread.thread_id)),
    ),
  );

/**
 * 连续滚动和顺序分页的下一页参数：已加载的全部 thread_id，作为 exclude_thread_ids 传给后端。
 * 返回 undefined 表示没有下一页。
 */
export function computeNextExcludeIds(
  allPages: (SearchResponse | undefined)[],
): string[] | undefined {
  if (allPages.length === 0) return undefined;

  const loadedThreadIds = collectThreadIds(allPages);
  const lastTotal = Number(allPages[allPages.length - 1]?.total || 0);

  if (loadedThreadIds.size === 0 || loadedThreadIds.size >= lastTotal) {
    return undefined;
  }

  // 分页靠累积 exclude_thread_ids 推进。若最后一页没有带来任何新帖子
  // （返回空页，或返回的都是已加载过的），下一次的 pageParam 会和上一次完全相同，
  // 触发同一个请求被无限重复。此时必须停下，哪怕 total 还没对上。
  if (loadedThreadIds.size === collectThreadIds(allPages.slice(0, -1)).size) {
    return undefined;
  }

  return Array.from(loadedThreadIds);
}

export function computeBufferedPageTarget(
  viewedPage: number,
  enabled: boolean,
  bufferPages: number,
) {
  return viewedPage + (enabled ? Math.max(1, bufferPages) - 1 : 0);
}

export function buildResultPageMap(
  pages: (SearchResponse | undefined)[],
) {
  const pageMap = new Map<string, number>();
  pages.forEach((pageData, pageIndex) => {
    ((pageData?.results || []) as Thread[]).forEach((thread) => {
      pageMap.set(String(thread.thread_id), pageIndex + 1);
    });
  });
  return pageMap;
}

export function useSearchResults({
  params,
  preferences,
  enabled = true,
}: UseSearchResultsOptions) {
  const {
    query,
    channel: selectedChannel,
    includeTags,
    excludeTags,
    includeAuthors,
    excludeAuthors,
    tagLogic,
    sortMethod,
    sortOrder,
    page,
    timeFrom,
    timeTo,
    reactionMin,
    replyMin,
  } = params;

  const [ignoreDiscoveryPreferences, setIgnoreDiscoveryPreferences] = useState(false);
  const [preloadPaused, setPreloadPaused] = useState(false);
  const [visibleRateLimit, setVisibleRateLimit] = useState<RateLimitInfo | null>(null);
  const [rateLimitClock, setRateLimitClock] = useState(() => Date.now());
  const nextPageOriginRef = useRef<RateLimitOrigin>('foreground');
  const attemptedForegroundPageRef = useRef<number | null>(null);
  const resultPagingMode = useResultPagingModeSetting();
  const resultPreload = useResultPreloadSettings();
  const currentPage = Math.max(1, page || 1);

  const hasExplicitFilters =
    includeTags.length > 0 ||
    excludeTags.length > 0 ||
    includeAuthors.length > 0 ||
    excludeAuthors.length > 0 ||
    !!timeFrom ||
    !!timeTo ||
    reactionMin !== null ||
    replyMin !== null ||
    (sortMethod && sortMethod !== 'last_active_desc') ||
    (tagLogic && tagLogic !== DEFAULT_TAG_LOGIC);

  const discoveryPreferenceContext = useMemo(
    () => getDiscoveryPreferenceContext(preferences),
    [preferences],
  );

  const applyPreferences = !ignoreDiscoveryPreferences;
  const resultSignature = JSON.stringify([
    query,
    selectedChannel,
    includeTags,
    excludeTags,
    includeAuthors,
    excludeAuthors,
    tagLogic,
    sortMethod,
    sortOrder,
    timeFrom,
    timeTo,
    reactionMin,
    replyMin,
    applyPreferences,
    discoveryPreferenceContext?.signature,
    resultPagingMode,
  ]);
  const [viewedPageState, setViewedPageState] = useState({
    signature: resultSignature,
    page: 1,
    maxPage: 1,
  });


  const infiniteQueryState = useInfiniteQuery<SearchResponse, Error, InfiniteData<SearchResponse>, ReturnType<typeof searchKeys.results>, string[]>({
    queryKey: searchKeys.results({
      ...params,
      page: 1,
      applyPreferences,
      preferenceSignature: discoveryPreferenceContext?.signature,
      resultPagingMode,
    }),
    queryFn: ({ pageParam, signal }) => {
      const excludeThreadIds = pageParam;
      const origin =
        excludeThreadIds.length > 0 ? nextPageOriginRef.current : 'foreground';
      return searchApi.search(
        {
          query: query || undefined,
          channel_ids: selectedChannel ? [selectedChannel] : undefined,
          include_tags: includeTags.length > 0 ? includeTags : undefined,
          exclude_tags: excludeTags.length > 0 ? excludeTags : undefined,
          tag_logic: tagLogic,
          sort_method: sortMethod,
          sort_order: sortOrder,
          apply_preferences: applyPreferences,
          limit: PAGE_SIZE,
          offset: 0,
          exclude_thread_ids: excludeThreadIds,
          created_after: timeFrom || undefined,
          created_before: timeTo || undefined,
          reaction_min: reactionMin,
          reply_min: replyMin,
        },
        signal,
        origin,
      );
    },
    initialPageParam: [],
    getNextPageParam: (_lastPage, allPages = []) => computeNextExcludeIds(allPages),
    staleTime: RESULTS_STALE_TIME,
    enabled,
  });

  const loadedPageCount = infiniteQueryState.data?.pages.length || 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    infiniteQueryState;

  const revealRateLimit = useCallback((info: RateLimitInfo) => {
    const visibleInfo = { ...info, origin: 'foreground' as const };
    setRateLimitClock(Date.now());
    setVisibleRateLimit(visibleInfo);
    notifyRateLimit(visibleInfo);
  }, []);

  const revealActiveRateLimit = useCallback(() => {
    const activeRateLimit = getActiveRateLimit('search', 'foreground');
    if (!activeRateLimit) return false;
    setPreloadPaused(true);
    revealRateLimit(activeRateLimit);
    return true;
  }, [revealRateLimit]);

  const fetchNextPageWithOrigin = useCallback(
    async (origin: RateLimitOrigin) => {
      nextPageOriginRef.current = origin;
      const result = await fetchNextPage();
      if (!result.isError && origin === 'foreground') {
        attemptedForegroundPageRef.current = null;
        setPreloadPaused(false);
        setVisibleRateLimit(null);
      }
      return result;
    },
    [fetchNextPage],
  );

  const viewedPage =
    resultPagingMode === 'pagination'
      ? currentPage
      : viewedPageState.signature === resultSignature
        ? viewedPageState.page
        : 1;

  const preloadAnchorPage =
    resultPagingMode === 'pagination'
      ? currentPage
      : viewedPageState.signature === resultSignature
        ? viewedPageState.maxPage
        : 1;

  const requestedPageCount = computeBufferedPageTarget(
    preloadAnchorPage,
    resultPreload.enabled,
    resultPreload.pages,
  );

  useEffect(() => {
    nextPageOriginRef.current = 'foreground';
    attemptedForegroundPageRef.current = null;
    const timer = window.setTimeout(() => {
      const activeRateLimit = getActiveRateLimit('search', 'foreground');
      setPreloadPaused(Boolean(activeRateLimit));
      if (activeRateLimit) {
        revealRateLimit(activeRateLimit);
      } else {
        setVisibleRateLimit(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resultSignature, revealRateLimit]);

  useEffect(() => {
    const rateLimit = getRateLimitInfo(infiniteQueryState.error);
    if (!rateLimit) return;

    const timer = window.setTimeout(() => {
      setPreloadPaused(true);
      if (rateLimit.origin === 'preload') return;
      setRateLimitClock(Date.now());
      setVisibleRateLimit(rateLimit);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [infiniteQueryState.error]);

  useEffect(() => {
    if (!visibleRateLimit?.retryAt) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setRateLimitClock(now);
      if (
        visibleRateLimit.retryAt !== null &&
        visibleRateLimit.retryAt <= now
      ) {
        setVisibleRateLimit(null);
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [visibleRateLimit]);

  const visibleRateLimitRemaining = visibleRateLimit
    ? getRemainingRateLimitSeconds(visibleRateLimit, rateLimitClock)
    : null;

  useEffect(() => {
    const needsForegroundPage = loadedPageCount < viewedPage;
    if (
      !enabled ||
      requestedPageCount <= loadedPageCount ||
      !hasNextPage ||
      isFetchingNextPage ||
      (!needsForegroundPage &&
        (preloadPaused || infiniteQueryState.isFetchNextPageError)) ||
      (needsForegroundPage &&
        infiniteQueryState.isFetchNextPageError &&
        attemptedForegroundPageRef.current === viewedPage)
    ) {
      return;
    }

    if (needsForegroundPage) {
      const activeRateLimit = getActiveRateLimit('search', 'foreground');
      if (activeRateLimit) {
        const timer = window.setTimeout(() => {
          setPreloadPaused(true);
          revealRateLimit(activeRateLimit);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }

    const origin: RateLimitOrigin = needsForegroundPage
      ? 'foreground'
      : 'preload';
    if (origin === 'foreground')
      attemptedForegroundPageRef.current = viewedPage;
    const timer = window.setTimeout(() => {
      void fetchNextPageWithOrigin(origin);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    enabled,
    fetchNextPageWithOrigin,
    hasNextPage,
    infiniteQueryState.isFetchNextPageError,
    isFetchingNextPage,
    loadedPageCount,
    preloadPaused,
    revealRateLimit,
    requestedPageCount,
    viewedPage,
  ]);

  const reportViewedPage = useCallback(
    (pageNumber: number) => {
      const normalizedPage = Math.max(1, Math.floor(pageNumber));
      setViewedPageState((current) => {
        if (
          current.signature === resultSignature &&
          current.page === normalizedPage
        ) {
          return current;
        }
        return {
          signature: resultSignature,
          page: normalizedPage,
          maxPage:
            current.signature === resultSignature
              ? Math.max(current.maxPage, normalizedPage)
              : normalizedPage,
        };
      });
    },
    [resultSignature],
  );

  const requestNextPage = useCallback(() => {
    if (!enabled || isFetchingNextPage || !hasNextPage || revealActiveRateLimit()) return;
    reportViewedPage(Math.max(1, loadedPageCount));
    void fetchNextPageWithOrigin('foreground');
  }, [
    enabled,
    fetchNextPageWithOrigin,
    hasNextPage,
    isFetchingNextPage,
    loadedPageCount,
    reportViewedPage,
    revealActiveRateLimit,
  ]);

  const preparePageRequest = useCallback(
    (pageNumber: number) => {
      if (!enabled) return false;
      if (pageNumber <= loadedPageCount) return true;
      if (revealActiveRateLimit()) return false;
      attemptedForegroundPageRef.current = null;

      if (
        pageNumber === currentPage &&
        infiniteQueryState.isFetchNextPageError &&
        !isFetchingNextPage
      ) {
        attemptedForegroundPageRef.current = null;
        void fetchNextPageWithOrigin('foreground');
        return false;
      }
      return true;
    },
    [
      currentPage,
      enabled,
      fetchNextPageWithOrigin,
      infiniteQueryState.isFetchNextPageError,
      isFetchingNextPage,
      loadedPageCount,
      revealActiveRateLimit,
    ],
  );

  useEffect(() => {
    const handleSearchSubmit = () => {
      if (!enabled) return;
      if (revealActiveRateLimit()) return;
      nextPageOriginRef.current = 'foreground';
      attemptedForegroundPageRef.current = null;
      setPreloadPaused(false);
      setVisibleRateLimit(null);
      void refetch().then((result) => {
        if (!result.isError) setPreloadPaused(false);
      });
    };

    window.addEventListener(SEARCH_SUBMIT_EVENT, handleSearchSubmit);
    return () =>
      window.removeEventListener(SEARCH_SUBMIT_EVENT, handleSearchSubmit);
  }, [enabled, refetch, revealActiveRateLimit]);

  const results = useMemo<Thread[]>(() => {
    if (resultPagingMode === 'infinite') {
      return infiniteQueryState.data?.pages.flatMap((pageData) => (pageData?.results || []) as Thread[]) || [];
    }

    return (infiniteQueryState.data?.pages[currentPage - 1]?.results || []) as Thread[];
  }, [currentPage, infiniteQueryState.data, resultPagingMode]);
  const pageByThreadId = useMemo(() => {
    return buildResultPageMap(infiniteQueryState.data?.pages || []);
  }, [infiniteQueryState.data]);

  const totalResults = Number(infiniteQueryState.data?.pages[0]?.total || 0);
  const isLoadingRequestedPage =
    resultPagingMode === 'pagination' &&
    currentPage > loadedPageCount &&
    (infiniteQueryState.hasNextPage || infiniteQueryState.isFetchingNextPage);

  const hasSearchFilters = !!query || hasExplicitFilters;
  const isPreferenceActive = !!discoveryPreferenceContext && applyPreferences;
  const showPreferenceBanner =
    !query.trim() && !selectedChannel && !hasExplicitFilters && isPreferenceActive;

  return {
    discoveryPreferenceContext,
    hasExplicitFilters,
    hasSearchFilters,
    ignoreDiscoveryPreferences,
    infiniteQueryState,
    isPreferenceActive,
    showPreferenceBanner,
    pageSize: PAGE_SIZE,
    pageByThreadId,
    loadedPageCount,
    preparePageRequest,
    queryState: {
      ...infiniteQueryState,
      isLoading: infiniteQueryState.isLoading || isLoadingRequestedPage,
    },
    results,
    resultPagingMode,
    requestNextPage,
    reportViewedPage,
    viewedPage,
    setIgnoreDiscoveryPreferences,
    totalResults,
    visibleRateLimit: visibleRateLimit
      ? { info: visibleRateLimit, remaining: visibleRateLimitRemaining }
      : null,
  };
}
