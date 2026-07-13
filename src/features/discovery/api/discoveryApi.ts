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

export const discoveryApi = {
  getRail: async (
    key: DiscoveryRailKey,
    params: {
      limit?: number;
      days?: number;
      offset?: number;
      apply_preferences?: boolean;
    } = {},
  ): Promise<Thread[]> => {
    const response = await apiClient.get<Thread[]>(`/discovery/rails/${key}`, {
      params: {
        limit: params.limit ?? 12,
        days: params.days ?? 30,
        offset: params.offset ?? 0,
        apply_preferences: params.apply_preferences ?? true,
      },
    });
    return dedupeThreads(response.data || []);
  },

  getRails: async (
    params: { limit?: number; days?: number; apply_preferences?: boolean } = {},
  ): Promise<DiscoveryRailsResponse> => {
    const response = await apiClient.get<DiscoveryRailsResponse>(
      "/discovery/rails",
      {
        params: {
          limit: params.limit ?? 12,
          days: params.days ?? 30,
          apply_preferences: params.apply_preferences ?? true,
        },
      },
    );
    return response.data;
  },

  getRandomThreads: async (
    params: {
      limit?: number;
      channel_ids?: string[] | null;
      include_tags?: string[] | null;
      exclude_tags?: string[] | null;
      tag_logic?: "and" | "or";
    } = {},
  ): Promise<Thread[]> => {
    const channelIds = (params.channel_ids || [])
      .flatMap((id) => String(id).split(","))
      .map((id) => id.trim())
      .filter(Boolean);
    const response = await apiClient.get<Thread[]>("/discovery/random", {
      params: {
        limit: params.limit ?? 10,
        channel_ids: channelIds.length ? channelIds : undefined,
        include_tags: params.include_tags || undefined,
        exclude_tags: params.exclude_tags || undefined,
        tag_logic: params.tag_logic ?? "and",
      },
      paramsSerializer: { indexes: null },
    });
    return dedupeThreads(response.data || []);
  },
};
