import { useEffect, useMemo, useState } from 'react';

import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import type { SearchResponse, Thread } from '@/entities/thread/types';
import { searchApi } from '@/features/search/api/searchApi';
import {
  getDiscoveryPreferenceContext,
} from '@/features/preferences/lib/discoveryPreferences';
import type { UserPreferencesResponse } from '@/features/preferences/api/preferencesApi';
import {
  getSearchTagLogicPreference,
  type SearchParams,
} from '@/features/search/hooks/useSearchParams';
import { searchKeys } from '@/features/search/lib/queryKeys';
import { useResultPagingModeSetting } from '@/shared/hooks/useSettings';

interface UseSearchResultsOptions {
  params: SearchParams;
  preferences: UserPreferencesResponse | null | undefined;
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

  const queryClient = useQueryClient();
  const [ignoreDiscoveryPreferences, setIgnoreDiscoveryPreferences] = useState(false);
  const resultPagingMode = useResultPagingModeSetting();
  const pageSize = 24;
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
    (tagLogic && tagLogic !== getSearchTagLogicPreference());

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
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        created_after: timeFrom || undefined,
        created_before: timeTo || undefined,
        reaction_min: reactionMin,
        reply_min: replyMin,
      });
    },
    enabled: resultPagingMode === 'pagination',
    placeholderData: (prev) => prev,
    staleTime: 0,
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
        limit: pageSize,
        offset: 0,
        exclude_thread_ids: excludeThreadIds,
        created_after: timeFrom || undefined,
        created_before: timeTo || undefined,
        reaction_min: reactionMin,
        reply_min: replyMin,
      });
    },
    initialPageParam: [],
    getNextPageParam: (_lastPage, allPages = []) => {
      if (allPages.length === 0) return undefined;

      const loadedThreadIds = allPages.flatMap((pageData) =>
        ((pageData?.results || []) as Thread[]).map((thread) => String(thread.thread_id)),
      );
      const lastTotal = Number(allPages[allPages.length - 1]?.total || 0);

      if (loadedThreadIds.length === 0 || loadedThreadIds.length >= lastTotal) {
        return undefined;
      }

      return Array.from(new Set(loadedThreadIds));
    },
    enabled: resultPagingMode === 'infinite',
    staleTime: 0,
  });

  useEffect(() => {
    // 显式重置所有搜索结果。这会清除缓存并强制重新请求第一页。
    // 解决切换“偏好开关”时 UI 不刷新的问题。
    queryClient.resetQueries({ queryKey: searchKeys.all });
  }, [applyPreferences, queryClient]);

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
    pageSize,
    queryState: resultPagingMode === 'infinite' ? infiniteQueryState : queryState,
    results,
    resultPagingMode,
    setIgnoreDiscoveryPreferences,
    totalResults,
  };
}
