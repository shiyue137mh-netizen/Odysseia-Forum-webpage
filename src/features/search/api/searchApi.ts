import { SearchParams as ApiSearchParams, SearchResponse, SimilarThreadsResponse, Thread } from '@/entities/thread/types';
import { apiClient } from '@/shared/api/client';
import {
  getActiveRateLimit,
  getRateLimitInfo,
  RateLimitError,
  rememberRateLimit,
  type RateLimitOrigin,
} from '@/shared/api/rateLimit';
import { tokenizeSearchPayload } from '@/shared/lib/searchTokenizer';

export type UISortMethod =
  | 'relevance'
  | 'last_active_desc'
  | 'created_desc'
  | 'reply_desc'
  | 'reaction_desc';
export type UISortOrder = 'asc' | 'desc';

export interface SearchUIRequest {
  query?: string;
  channel_ids?: Array<number | string> | null;
  include_tags?: string[];
  exclude_tags?: string[];
  include_authors?: Array<number | string>;
  exclude_authors?: Array<number | string>;
  tag_logic?: 'and' | 'or';
  sort_method?: UISortMethod;
  sort_order?: UISortOrder;
  created_after?: string | null;
  created_before?: string | null;
  active_after?: string | null;
  active_before?: string | null;
  reaction_min?: number | null;
  reply_min?: number | null;
  limit?: number;
  offset?: number;
  guild_id?: number;
  search_by_collection?: boolean;
  author_name?: string;
  // 【权宜之计】排除已展示的帖子 ID 列表。
  // 由于 Discord ID 存在 64 位整数溢出问题，前端统一使用字符串存储和传递。
  exclude_thread_ids?: string[];
  apply_preferences?: boolean;
}

export interface SearchSuggestionAuthor {
  id: string;
  name: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface SearchSuggestionThread {
  thread_id: string;
  title: string;
  channel_id: string;
  guild_id: string;
}

export interface SearchSuggestionBooklist {
  id: number;
  title: string;
  item_count: number;
}

export interface SearchSuggestionResponse {
  authors?: SearchSuggestionAuthor[];
  threads?: SearchSuggestionThread[];
  booklists?: SearchSuggestionBooklist[];
}

export interface SearchHistoryItem {
  id?: string;
  query: string;
  timestamp: number;
}

export interface ChannelTagCatalogItem {
  channel_id: string;
  channel_name: string;
  available_tags: string[];
  virtual_tags: string[];
}

const DEFAULT_NUMERIC_RANGE = '[0, 10000000)';
type ApiTagDetail = { name?: string | null };
type ApiVirtualTagDetail = { tag_name?: string | null; name?: string | null };
type ApiMappedSourceChannel = {
  available_tags?: ApiTagDetail[] | null;
};
type ApiChannelDetail = {
  channel_id?: string | number | null;
  name?: string | null;
  channel_name?: string | null;
  available_tags?: ApiTagDetail[] | null;
  virtual_tags?: ApiVirtualTagDetail[] | null;
  mapped_source_channels?: ApiMappedSourceChannel[] | null;
};

function normalizeIdList(values?: Array<number | string> | null): string[] | null {
  if (!values || values.length === 0) return null;

  const normalized = values
    .map((value) => String(value ?? '').trim())
    .filter((value) => /^\d+$/.test(value));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : null;
}

function toApiIntIdList(values: string[] | null): number[] | null {
  return values as unknown as number[] | null;
}

function mapSortMethod(sortMethod?: UISortMethod): ApiSearchParams['sort_method'] {
  const sortMap: Record<UISortMethod, ApiSearchParams['sort_method']> = {
    relevance: 'comprehensive',
    last_active_desc: 'last_active',
    created_desc: 'created_at',
    reply_desc: 'reply_count',
    reaction_desc: 'reaction_count',
  };

  return sortMap[sortMethod || 'last_active_desc'] || 'last_active';
}

function dedupeStrings(values: Array<string | number | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  );
}

function normalizeTagNames(values: Array<string | number | null | undefined>) {
  return dedupeStrings(values);
}

function normalizeChannelTagCatalogItem(channel: ApiChannelDetail): ChannelTagCatalogItem | null {
  const channelId = String(channel.channel_id ?? '').trim();
  if (!channelId) return null;

  const sourceTags = (channel.mapped_source_channels || []).flatMap((source) =>
    (source.available_tags || []).map((tag) => tag.name),
  );

  return {
    channel_id: channelId,
    channel_name: String(channel.name || channel.channel_name || channelId),
    available_tags: normalizeTagNames([
      ...(channel.available_tags || []).map((tag) => tag.name),
      ...sourceTags,
    ]),
    virtual_tags: normalizeTagNames(
      (channel.virtual_tags || []).map((tag) => tag.tag_name || tag.name),
    ),
  };
}

function escapeKeywordPhrase(value: string) {
  return value.replace(/"/g, '').trim();
}

function buildKeywordString(text: string, includeAuthorNames: string[]) {
  const keywordParts: string[] = [];

  if (includeAuthorNames.length > 0) {
    // 后端真正识别的是 keywords 里的 author: 语法，
    // 而不是 SearchRequest.author_name 字段。
    // 当前先兼容一个作者 token；多作者精确并集后端暂不支持。
    const primaryAuthor = escapeKeywordPhrase(includeAuthorNames[0]);
    if (primaryAuthor) {
      keywordParts.push(`author:"${primaryAuthor}"`);
    }
  }

  if (text) {
    keywordParts.push(text);
  }

  return keywordParts.join(' ').trim() || null;
}

function buildSearchRequest(params: SearchUIRequest): ApiSearchParams {
  const tokenized = tokenizeSearchPayload(params.query || '');

  const channelIdsFromUrl = normalizeIdList(params.channel_ids);
  const channelIdsFromTokens = normalizeIdList(tokenized.channels);
  const channel_ids = channelIdsFromUrl ?? channelIdsFromTokens;

  const includeAuthorNames = dedupeStrings(
    tokenized.includeAuthors.filter((value) => !/^\d+$/.test(value)),
  );
  const includeAuthorIds = normalizeIdList([
    ...(params.include_authors ?? []),
    ...tokenized.includeAuthors.filter((value) => /^\d+$/.test(value)),
  ]);
  const excludeAuthorIds = normalizeIdList([
    ...(params.exclude_authors ?? []),
    ...tokenized.excludeAuthors.filter((value) => /^\d+$/.test(value)),
  ]);

  const includeTags = dedupeStrings([...(params.include_tags || []), ...tokenized.includeTags]);
  const excludeTags = dedupeStrings([...(params.exclude_tags || []), ...tokenized.excludeTags]);

  const requestBody: Partial<ApiSearchParams> = {
    guild_id: params.guild_id,
    channel_ids: toApiIntIdList(channel_ids) || undefined,
    include_tags: includeTags.length > 0 ? includeTags : undefined,
    exclude_tags: excludeTags.length > 0 ? excludeTags : undefined,
    tag_logic: params.tag_logic === 'or' ? 'or' : (params.tag_logic === 'and' ? 'and' : undefined),
    keywords: buildKeywordString(tokenized.text, includeAuthorNames) || undefined,
    include_authors: toApiIntIdList(includeAuthorIds) || undefined,
    exclude_authors: toApiIntIdList(excludeAuthorIds) || undefined,
    author_name: params.author_name || undefined,
    exclude_keywords: undefined, // Let backend merge from preferences if apply_preferences is true
    search_by_collection: params.search_by_collection || undefined,
    apply_preferences: params.apply_preferences ?? true,
    created_after: params.created_after || tokenized.dateFrom || undefined,
    created_before: params.created_before || tokenized.dateTo || undefined,
    active_after: params.active_after || undefined,
    active_before: params.active_before || undefined,
    sort_method: params.sort_method ? mapSortMethod(params.sort_method) : undefined,
    sort_order: params.sort_order ?? 'desc',
    limit: params.limit || 24,
    offset: params.offset || 0,
    exclude_thread_ids: (params.exclude_thread_ids || []) as unknown as number[],
    reaction_count_range: (params.reaction_min ?? tokenized.reactionMin) === null
      ? DEFAULT_NUMERIC_RANGE
      : `[${params.reaction_min ?? tokenized.reactionMin}, 10000000)`,
    reply_count_range: (params.reply_min ?? tokenized.replyMin) === null
      ? DEFAULT_NUMERIC_RANGE
      : `[${params.reply_min ?? tokenized.replyMin}, 10000000)`,
    custom_base_sort: 'comprehensive',
  };

  // 移除所有 undefined 的键，确保它们不在 JSON body 中出现
  // 这样后端的 model_dump(exclude_unset=True) 才能正确识别并合并偏好
  return Object.fromEntries(
    Object.entries(requestBody).filter(([_, v]) => v !== undefined)
  ) as ApiSearchParams;
}

export const searchApi = {
  search: async (
    params: SearchUIRequest = {},
    signal?: AbortSignal,
    origin: RateLimitOrigin = 'foreground',
  ): Promise<SearchResponse> => {
    const activeRateLimit = getActiveRateLimit('search', origin);
    if (activeRateLimit) throw new RateLimitError(activeRateLimit);

    const requestBody = buildSearchRequest(params);
    try {
      const response = signal
        ? await apiClient.post<SearchResponse>('/search/', requestBody, { signal })
        : await apiClient.post<SearchResponse>('/search/', requestBody);
      return response.data;
    } catch (error) {
      const rateLimit = getRateLimitInfo(error, { scope: 'search', origin });
      if (!rateLimit) throw error;
      throw new RateLimitError(rememberRateLimit(rateLimit), error);
    }
  },

  getThread: async (threadId: string, signal?: AbortSignal): Promise<Thread> => {
    const response = signal
      ? await apiClient.get<Thread>(`/search/thread/${threadId}`, { signal })
      : await apiClient.get<Thread>(`/search/thread/${threadId}`);
    return response.data;
  },

  getSimilarThreads: async (threadId: string, limit = 6): Promise<SimilarThreadsResponse> => {
    const response = await apiClient.get<SimilarThreadsResponse>(`/search/thread/${threadId}/similar`, {
      params: { limit },
    });
    return response.data;
  },

  getChannelTagCatalog: async (channelId?: string | number | null): Promise<ChannelTagCatalogItem[]> => {
    const response = await apiClient.get<ApiChannelDetail[]>('/meta/channels', {
      params: channelId ? { channel_ids: String(channelId) } : undefined,
    });

    return (response.data || [])
      .map(normalizeChannelTagCatalogItem)
      .filter((item): item is ChannelTagCatalogItem => Boolean(item));
  },

  // 通过 /meta/channels 聚合全局标签
  getGlobalTags: async (): Promise<string[]> => {
    const tagSet = new Set<string>();
    const catalog = await searchApi.getChannelTagCatalog();
    for (const item of catalog) {
      for (const tag of item.virtual_tags) {
        if (tag?.trim()) tagSet.add(tag.trim());
      }
      for (const tag of item.available_tags) {
        if (tag?.trim()) tagSet.add(tag.trim());
      }
    }

    return Array.from(tagSet);
  },

  getSuggestions: async (
    keyword: string,
    applyPreferences = true,
  ): Promise<SearchSuggestionResponse> => {
    const response = await apiClient.get<SearchSuggestionResponse>('/search/suggestions', {
      params: {
        keyword,
        apply_preferences: applyPreferences,
      },
    });
    return response.data;
  },
};
