import type { SearchParams } from "@/features/search/hooks/useSearchParams";

export const searchKeys = {
  all: ["search"] as const,
  results: (
    params: SearchParams & {
      applyPreferences?: boolean;
      preferenceSignature?: string;
      resultPagingMode?: string;
    },
  ) =>
    [
      ...searchKeys.all,
      "results",
      {
        query: params.query,
        channel: params.channel,
        includeAuthors: params.includeAuthors,
        excludeAuthors: params.excludeAuthors,
        tagLogic: params.tagLogic,
        sortMethod: params.sortMethod,
        sortOrder: params.sortOrder,
        page: params.page,
        timeFrom: params.timeFrom,
        timeTo: params.timeTo,
        reactionMin: params.reactionMin,
        replyMin: params.replyMin,
        resultPagingMode: params.resultPagingMode ?? "pagination",
        applyPreferences: params.applyPreferences ?? false,
        preferenceSignature: params.preferenceSignature ?? "no-preferences",
      },
    ] as const,
  filterMeta: (channelId: string | null) =>
    [...searchKeys.all, "filter-meta", { channelId }] as const,
  channelTagCatalog: (channelId?: string | null) =>
    [...searchKeys.all, "channel-tag-catalog", { channelId: channelId ?? null }] as const,
  suggestions: (params: {
    query: string;
    channel: string | null;
    preferenceSignature?: string;
  }) =>
    [
      ...searchKeys.all,
      "suggestions",
      {
        query: params.query,
        channel: params.channel,
        preferenceSignature: params.preferenceSignature ?? "no-preferences",
      },
    ] as const,
  booklistResults: (params: {
    query: string;
    pageIndex: number;
    pageSize: number;
  }) => [...searchKeys.all, "booklist-results", params] as const,
  drawPool: (params: {
    preferenceSignature: string;
    scopeMode: string;
    selectedChannelId: string;
    effectiveChannelIds?: string[];
  }) =>
    [
      ...searchKeys.all,
      "draw-pool",
      {
        preferenceSignature: params.preferenceSignature,
        scopeMode: params.scopeMode,
        selectedChannelId: params.selectedChannelId,
        effectiveChannelIds: params.effectiveChannelIds ?? [],
      },
    ] as const,
  thread: (threadId: string | null) =>
    [...searchKeys.all, "thread", threadId] as const,
};
