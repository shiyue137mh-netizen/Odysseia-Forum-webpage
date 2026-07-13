import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { searchApi } from "@/features/search/api/searchApi";
import type { UserPreferencesResponse } from "@/features/preferences/api/preferencesApi";
import {
  getDiscoveryPreferenceContext,
} from "@/features/preferences/lib/discoveryPreferences";
import { ALL_VIRTUAL_TAGS } from "@/shared/config/navigation";
import { parseSearchQuery, tokenizeSearchPayload } from "@/shared/lib/searchTokenizer";
import type { SearchParams } from "@/features/search/hooks/useSearchParams";
import { searchKeys } from "@/features/search/lib/queryKeys";

function mergeUnique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

interface UseSearchAutocompleteOptions {
  params: SearchParams;
  preferences: UserPreferencesResponse | null | undefined;
  searchInput: string;
  debouncedQuery: string;
  showSuggestions: boolean;
}

export function useSearchAutocomplete({
  params,
  preferences,
  searchInput,
  debouncedQuery,
  showSuggestions,
}: UseSearchAutocompleteOptions) {
  const suggestionQuery = useMemo(
    () => tokenizeSearchPayload(debouncedQuery).text,
    [debouncedQuery],
  );
  const activeVirtualTag = useMemo(() => {
    const tokens = parseSearchQuery(searchInput || "");
    const tagToken = tokens.find(
      (token) => token.type === "tag" && token.mode === "include",
    );
    if (!tagToken) return null;
    return (
      ALL_VIRTUAL_TAGS.find(
        (virtualTag) => virtualTag.name === tagToken.value,
      ) ?? null
    );
  }, [searchInput]);

  const { data: channelTagCatalog = [] } = useQuery({
    queryKey: searchKeys.channelTagCatalog(params.channel),
    queryFn: () => searchApi.getChannelTagCatalog(params.channel),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const globalAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    const scopedCatalog = params.channel
      ? channelTagCatalog.filter((channel) => channel.channel_id === params.channel)
      : channelTagCatalog;

    for (const channel of scopedCatalog) {
      for (const tag of channel.available_tags || []) {
        if (tag?.trim()) tagSet.add(tag.trim());
      }
      for (const tag of channel.virtual_tags || []) {
        if (tag?.trim()) tagSet.add(tag.trim());
      }
    }
    return Array.from(tagSet);
  }, [channelTagCatalog, params.channel]);

  const virtualTagOriginChannelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const channel of channelTagCatalog) {
      for (const tag of channel.virtual_tags || []) {
        if (tag?.trim() && !map.has(tag.trim())) {
          map.set(tag.trim(), channel.channel_id);
        }
      }
    }
    return map;
  }, [channelTagCatalog]);

  const availableTags = useMemo(() => {
    return mergeUnique([
      ...globalAvailableTags,
      ...params.includeTags,
      ...params.excludeTags,
    ]);
  }, [globalAvailableTags, params.includeTags, params.excludeTags]);

  const discoveryPreferenceContext = useMemo(
    () => getDiscoveryPreferenceContext(preferences),
    [preferences],
  );

  // 使用后端专用的搜索建议 API，一次请求返回作者、帖子和书单
  const { data: suggestionsData } = useQuery({
    queryKey: searchKeys.suggestions({
      query: suggestionQuery,
      channel: params.channel,
      preferenceSignature: discoveryPreferenceContext?.signature,
    }),
    queryFn: () => searchApi.getSuggestions(suggestionQuery),
    enabled: showSuggestions && suggestionQuery.length > 0,
    staleTime: 30 * 1000,
    retry: false,
  });

  const suggestionThreads = useMemo(
    () => suggestionsData?.threads || [],
    [suggestionsData?.threads],
  );

  const suggestionAuthors = useMemo(
    () => suggestionsData?.authors || [],
    [suggestionsData?.authors],
  );

  // 新 API 不包含标签建议，标签补全依赖 channelTagCatalog
  const suggestionTags = useMemo(() => [] as string[], []);

  const suggestionBooklists = useMemo(
    () => suggestionsData?.booklists || [],
    [suggestionsData?.booklists],
  );

  return {
    activeVirtualTag,
    availableTags,
    discoveryPreferenceContext,
    suggestionAuthors,
    suggestionTags,
    suggestionThreads,
    suggestionBooklists,
    suggestionQuery,
    virtualTagOriginChannelMap,
  };
}
