import { useMemo, useState } from 'react';

import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';

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
import { useResultPagingModeSetting } from '@/shared/hooks/useSettings';

interface UseSearchResultsOptions {
  params: SearchParams;
  preferences: UserPreferencesResponse | null | undefined;
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
 * 无限滚动的下一页参数：已加载的全部 thread_id，作为 exclude_thread_ids 传给后端。
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

export function useSearchResults({ params, preferences }: UseSearchResultsOptions) {
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
  const resultPagingMode = useResultPagingModeSetting();
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


  const queryState = useQuery<SearchResponse, Error>({
    queryKey: searchKeys.results({
      ...params,
      applyPreferences,
      preferenceSignature: discoveryPreferenceContext?.signature,
      resultPagingMode: 'pagination',
    }),
    queryFn: () => {
      return searchApi.search({
        query: query || undefined,
        channel_ids: selectedChannel ? [selectedChannel] : undefined,
        include_tags: includeTags.length > 0 ? includeTags : undefined,
        exclude_tags: excludeTags.length > 0 ? excludeTags : undefined,
        tag_logic: tagLogic,
        sort_method: sortMethod,
        sort_order: sortOrder,
        apply_preferences: applyPreferences,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        created_after: timeFrom || undefined,
        created_before: timeTo || undefined,
        reaction_min: reactionMin,
        reply_min: replyMin,
      });
    },
    enabled: resultPagingMode === 'pagination',
    placeholderData: (prev) => prev,
    staleTime: RESULTS_STALE_TIME,
  });

  const infiniteQueryState = useInfiniteQuery<SearchResponse, Error, InfiniteData<SearchResponse>, ReturnType<typeof searchKeys.results>, string[]>({
    queryKey: searchKeys.results({
      ...params,
      page: 1,
      applyPreferences,
      preferenceSignature: discoveryPreferenceContext?.signature,
      resultPagingMode: 'infinite',
    }),
    queryFn: ({ pageParam }) => {
      const excludeThreadIds = pageParam;
      return searchApi.search({
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
      });
    },
    initialPageParam: [],
    getNextPageParam: (_lastPage, allPages = []) => computeNextExcludeIds(allPages),
    enabled: resultPagingMode === 'infinite',
    staleTime: RESULTS_STALE_TIME,
  });

  const results = useMemo<Thread[]>(() => {
    if (resultPagingMode === 'infinite') {
      return infiniteQueryState.data?.pages.flatMap((pageData) => (pageData?.results || []) as Thread[]) || [];
    }

    return (queryState.data?.results || []) as Thread[];
  }, [infiniteQueryState.data, queryState.data, resultPagingMode]);

  const totalResults = Number(
    resultPagingMode === 'infinite'
      ? infiniteQueryState.data?.pages[0]?.total || 0
      : queryState.data?.total || 0,
  );

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
    queryState: resultPagingMode === 'infinite' ? infiniteQueryState : queryState,
    results,
    resultPagingMode,
    setIgnoreDiscoveryPreferences,
    totalResults,
  };
}
