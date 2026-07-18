import type { Thread } from "@/entities/thread/types";
import { apiClient } from "@/shared/api/client";

export type DiscoveryRailKey =
  | "latest"
  | "reaction_surge"
  | "discussion_surge"
  | "collection_surge";

export interface DiscoveryRailsResponse {
  latest: Thread[];
  reaction_surge: Thread[];
  discussion_surge: Thread[];
  collection_surge: Thread[];
}

function dedupeThreads(threads: Thread[]) {
  const map = new Map<string, Thread>();
  for (const thread of threads) {
    if (thread?.thread_id && !map.has(thread.thread_id)) {
      map.set(thread.thread_id, thread);
    }
  }
  return Array.from(map.values());
}

function normalizeChannelIds(channelIds?: Array<string | number> | null) {
  return (channelIds || [])
    .flatMap((id) => String(id).split(","))
    .map((id) => id.trim())
    .filter(Boolean);
}

export const discoveryApi = {
  getRail: async (
    key: DiscoveryRailKey,
    params: {
      limit?: number;
      days?: number;
      offset?: number;
      channel_ids?: Array<string | number> | null;
      apply_preferences?: boolean;
    } = {},
  ): Promise<Thread[]> => {
    const channelIds = normalizeChannelIds(params.channel_ids);
    const response = await apiClient.get<Thread[]>(`/discovery/rails/${key}`, {
      params: {
        limit: params.limit ?? 12,
        days: params.days ?? 30,
        offset: params.offset ?? 0,
        channel_ids: channelIds.length ? channelIds : undefined,
        apply_preferences: params.apply_preferences ?? true,
      },
      paramsSerializer: { indexes: null },
    });
    return dedupeThreads(response.data || []);
  },

  getRails: async (
    params: {
      limit?: number;
      days?: number;
      channel_ids?: Array<string | number> | null;
      apply_preferences?: boolean;
    } = {},
  ): Promise<DiscoveryRailsResponse> => {
    const channelIds = normalizeChannelIds(params.channel_ids);
    const response = await apiClient.get<DiscoveryRailsResponse>(
      "/discovery/rails",
      {
        params: {
          limit: params.limit ?? 12,
          days: params.days ?? 30,
          channel_ids: channelIds.length ? channelIds : undefined,
          apply_preferences: params.apply_preferences ?? true,
        },
        paramsSerializer: { indexes: null },
      },
    );
    return response.data;
  },

  getRandomThreads: async (
    params: {
      limit?: number;
      channel_ids?: Array<string | number> | null;
      exclude_channel_ids?: Array<string | number> | null;
      include_tags?: string[] | null;
      exclude_tags?: string[] | null;
      tag_logic?: "and" | "or";
    } = {},
  ): Promise<Thread[]> => {
    const channelIds = normalizeChannelIds(params.channel_ids);
    const excludeChannelIds = normalizeChannelIds(params.exclude_channel_ids);
    const response = await apiClient.get<Thread[]>("/discovery/random", {
      params: {
        limit: params.limit ?? 10,
        channel_ids: channelIds.length ? channelIds : undefined,
        exclude_channel_ids: excludeChannelIds.length ? excludeChannelIds : undefined,
        include_tags: params.include_tags || undefined,
        exclude_tags: params.exclude_tags || undefined,
        tag_logic: params.tag_logic ?? "and",
      },
      paramsSerializer: { indexes: null },
    });
    return dedupeThreads(response.data || []);
  },
};
