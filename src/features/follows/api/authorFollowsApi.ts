import type { components } from "@shared-types/openapi";

import { apiClient } from "@/shared/api/client";

export type AuthorFollowList = components["schemas"]["AuthorFollowList"];
export type AuthorFollowItem =
  components["schemas"]["AuthorFollowItem-Output"];
export type AuthorFollowState = components["schemas"]["AuthorFollowState"];

export interface AuthorFollowsQueryParams {
  limit?: number;
  offset?: number;
  active?: boolean | null;
}

function normalizeAuthorId(authorId: string): string {
  const normalized = String(authorId).trim();
  if (!/^\d+$/.test(normalized)) throw new Error("无效作者 ID");
  return normalized;
}

export const authorFollowsApi = {
  list: async (
    params: AuthorFollowsQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AuthorFollowList> => {
    const response = await apiClient.get<AuthorFollowList>("/author-follows", {
      params: {
        limit: params.limit,
        offset: params.offset,
        active: params.active ?? undefined,
      },
      signal,
    });
    return response.data;
  },

  getState: async (authorId: string, signal?: AbortSignal): Promise<boolean> => {
    const normalizedAuthorId = normalizeAuthorId(authorId);
    const limit = 100;
    let offset = 0;

    // ponytail: 线上暂时没有单作者状态查询；按 100 条分页扫描保证结果准确，
    // 后端提供 GET /author-follows/{author_id} 或精确筛选后应立即替换。
    while (true) {
      const page = await authorFollowsApi.list(
        { limit, offset, active: true },
        signal,
      );
      if (
        page.results.some(
          (item) => String(item.author.id) === normalizedAuthorId && item.active,
        )
      ) {
        return true;
      }

      offset += page.results.length;
      if (page.results.length === 0 || offset >= page.total) return false;
    }
  },

  follow: async (authorId: string): Promise<AuthorFollowState> => {
    const response = await apiClient.post<AuthorFollowState>(
      `/author-follows/${normalizeAuthorId(authorId)}`,
    );
    return response.data;
  },

  unfollow: async (authorId: string): Promise<void> => {
    await apiClient.delete(`/author-follows/${normalizeAuthorId(authorId)}`);
  },
};
