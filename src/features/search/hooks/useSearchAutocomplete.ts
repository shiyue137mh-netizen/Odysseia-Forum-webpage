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
import {
  useChannels,
  type ChannelTagCatalogItem,
} from "@/shared/hooks/useChannels";

const EMPTY_CHANNEL_TAG_CATALOG: ChannelTagCatalogItem[] = [];

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
  enabled?: boolean;
}

export interface SearchTagGroup {
  groupId: string;
  groupName: string;
  tags: string[];
}

export function useSearchAutocomplete({
  params,
  preferences,
  searchInput,
  debouncedQuery,
  showSuggestions,
  enabled = true,
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

  const { data: channelsData } = useChannels();
  const channelTagCatalog =
    channelsData?.tagCatalog || EMPTY_CHANNEL_TAG_CATALOG;

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

  const channelTagGroups = useMemo<SearchTagGroup[]>(() => {
    const scopedCatalog = params.channel
      ? channelTagCatalog.filter((channel) => channel.channel_id === params.channel)
      : channelTagCatalog;
    const channels = scopedCatalog.map((channel) => ({
      channelId: channel.channel_id,
      channelName: channel.channel_name,
      tags: mergeUnique([...channel.virtual_tags, ...channel.available_tags]),
    }));
    const tagChannelCount = new Map<string, number>();
    for (const channel of channels) {
      for (const tag of channel.tags) {
        tagChannelCount.set(tag, (tagChannelCount.get(tag) || 0) + 1);
      }
    }
    const groups: SearchTagGroup[] = params.channel
      ? channels
          .filter((channel) => channel.tags.length > 0)
          .map((channel) => ({
            groupId: channel.channelId,
            groupName: channel.channelName,
            tags: channel.tags,
          }))
      : [
          {
            groupId: "shared",
            groupName: "共有标签",
            tags: Array.from(tagChannelCount)
              .filter(([, count]) => count > 1)
              .map(([tag]) => tag),
          },
          ...channels.map((channel) => ({
            groupId: `channel-${channel.channelId}`,
            groupName: `${channel.channelName} · 特色`,
            tags: channel.tags.filter((tag) => tagChannelCount.get(tag) === 1),
          })),
        ].filter((group) => group.tags.length > 0);
    const catalogTags = new Set(groups.flatMap((group) => group.tags));
    const uncataloguedSelectedTags = mergeUnique([
      ...params.includeTags,
      ...params.excludeTags,
    ]).filter((tag) => !catalogTags.has(tag));

    return uncataloguedSelectedTags.length > 0
      ? [{ groupId: "current-selection", groupName: "当前筛选", tags: uncataloguedSelectedTags }, ...groups]
      : groups;
  }, [channelTagCatalog, params.channel, params.excludeTags, params.includeTags]);

  const discoveryPreferenceContext = useMemo(
    () => getDiscoveryPreferenceContext(preferences),
    [preferences],
  );

  // 使用后端专用的搜索建议 API，一次请求返回作者、帖子和书单
  const { data: suggestionsData } = useQuery({
    queryKey: searchKeys.suggestions({
      query: suggestionQuery,
      applyPreferences: true,
    }),
    queryFn: () => searchApi.getSuggestions(suggestionQuery),
    enabled: enabled && showSuggestions && suggestionQuery.length > 0,
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
    channelTagGroups,
    discoveryPreferenceContext,
    suggestionAuthors,
    suggestionTags,
    suggestionThreads,
    suggestionBooklists,
    suggestionQuery,
    virtualTagOriginChannelMap,
  };
}
