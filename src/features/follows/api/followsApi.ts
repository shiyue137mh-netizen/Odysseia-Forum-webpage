import { apiClient } from "@/shared/api/client";
import type { FollowedThread } from "@/entities/thread/types";

// 后端 /v1/follows/ 原始返回结构
export interface FollowsThreadsResponse {
  total: number;
  threads: FollowedThread[];
  limit: number;
  offset: number;
}

// 通知中心 & 关注页使用的便捷结构
export interface FollowsResponse {
  results: FollowedThread[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface FollowsQueryParams {
  limit?: number;
  offset?: number;
  active_flag?: boolean | null;
  channel_ids?: Array<number | string> | null;
}

export const followsApi = {
  /**
   * 获取关注的帖子列表（后端原始结构）
   * GET /v1/follows/
   */
  getFollowsRaw: async (
    params: FollowsQueryParams = {},
  ): Promise<FollowsThreadsResponse> => {
    const response = await apiClient.get<FollowsThreadsResponse>("/follows/", {
      params: {
        limit: params.limit,
        offset: params.offset,
        active_flag: params.active_flag ?? undefined,
        channel_ids: params.channel_ids || undefined,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  },

  /**
   * 获取未读更新数量
   * GET /v1/follows/unread-count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get<UnreadCountResponse>(
      "/follows/unread-count",
    );
    return response.data;
  },

  /**
   * 标记所有关注为已查看
   * POST /v1/follows/mark-viewed
   */
  markAllViewed: async (): Promise<void> => {
    await apiClient.post("/follows/mark-viewed");
  },

  /**
   * 获取关注列表 + 未读数量的组合数据
   * 兼容 MePage 关注 tab 使用的结构
   */
  getFollows: async (
    params: FollowsQueryParams = {},
  ): Promise<FollowsResponse> => {
    const [follows, unread] = await Promise.all([
      followsApi.getFollowsRaw(params),
      followsApi.getUnreadCount(),
    ]);

    return {
      results: follows.threads,
      total: follows.total,
      unread_count: unread.unread_count ?? 0,
    };
  },

  // 关注帖子
  followThread: async (threadId: string): Promise<void> => {
    await apiClient.post(`/follows/${threadId}`);
  },

  // 取消关注
  unfollowThread: async (threadId: string): Promise<void> => {
    await apiClient.delete(`/follows/${threadId}`);
  },
};
