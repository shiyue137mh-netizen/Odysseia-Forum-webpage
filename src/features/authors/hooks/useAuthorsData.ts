import { useQuery } from "@tanstack/react-query";

import { authorsApi } from "@/features/authors/api/authorsApi";
import { authorKeys } from "@/features/authors/lib/queryKeys";
import { searchApi, type UISortMethod } from "@/features/search/api/searchApi";

const PROFILE_STALE_TIME = 5 * 60 * 1000;

export function useAuthorProfile(
  authorId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: authorKeys.profile(authorId ?? ""),
    queryFn: () => authorsApi.getAuthorProfile(authorId!),
    enabled: Boolean(authorId) && (options.enabled ?? true),
    staleTime: PROFILE_STALE_TIME,
  });
}

/** 作者主页的帖子列表（可按频道筛选、切换排序）。 */
export function useAuthorThreads(
  authorId: string | undefined,
  params: { sortMethod: UISortMethod; channelIds: string[] },
) {
  return useQuery({
    queryKey: authorKeys.threads(authorId ?? "", {
      sortMethod: params.sortMethod,
      channelIds: params.channelIds,
    }),
    enabled: Boolean(authorId),
    queryFn: () =>
      searchApi.search({
        include_authors: authorId ? [authorId] : [],
        author_name: authorId || undefined,
        sort_method: params.sortMethod,
        channel_ids:
          params.channelIds.length > 0 ? params.channelIds : undefined,
        limit: 48,
      }),
    staleTime: 60 * 1000,
  });
}

/** 作者悬浮卡里的近作预览（最多 3 条，排除当前帖，应用用户偏好）。 */
export function useAuthorRecentWorks(
  authorId: string,
  options: { excludeThreadId?: string; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: authorKeys.recentWorks(authorId, options.excludeThreadId),
    queryFn: () =>
      searchApi.search({
        include_authors: [authorId],
        exclude_thread_ids: options.excludeThreadId
          ? [options.excludeThreadId]
          : undefined,
        apply_preferences: true,
        limit: 3,
        sort_method: "created_desc",
      }),
    enabled: options.enabled ?? true,
    staleTime: PROFILE_STALE_TIME,
  });
}
