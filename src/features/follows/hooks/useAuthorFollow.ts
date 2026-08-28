import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { authorFollowsApi } from "@/features/follows/api/authorFollowsApi";
import { authorFollowKeys } from "@/features/follows/lib/queryKeys";
import { notifyError, notifySuccess } from "@/features/mascot/lib/notify";
import { extractErrorMessage } from "@/shared/lib/notify";

interface AuthorFollowStateOptions {
  enabled?: boolean;
  initialFollowed?: boolean;
}

interface AuthorFollowsListOptions {
  active?: boolean | null;
  enabled?: boolean;
}

const AUTHOR_FOLLOW_PAGE_SIZE = 50;

export function useAuthorFollowsList({
  active = true,
  enabled = true,
}: AuthorFollowsListOptions = {}) {
  return useInfiniteQuery({
    queryKey: authorFollowKeys.list({
      active,
      limit: AUTHOR_FOLLOW_PAGE_SIZE,
    }),
    queryFn: ({ pageParam, signal }) =>
      authorFollowsApi.list(
        {
          active,
          limit: AUTHOR_FOLLOW_PAGE_SIZE,
          offset: pageParam,
        },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.results.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAuthorFollowState(
  authorId: string | undefined,
  { enabled = true, initialFollowed }: AuthorFollowStateOptions = {},
) {
  const normalizedAuthorId = String(authorId ?? "").trim();
  return useQuery({
    queryKey: authorFollowKeys.state(normalizedAuthorId),
    queryFn: ({ signal }) =>
      authorFollowsApi.getState(normalizedAuthorId, signal),
    enabled: enabled && /^\d+$/.test(normalizedAuthorId),
    initialData: initialFollowed,
    staleTime: 60 * 1000,
  });
}

export function useToggleAuthorFollow(
  authorId: string | undefined,
  followed: boolean,
) {
  const queryClient = useQueryClient();
  const normalizedAuthorId = String(authorId ?? "").trim();

  return useMutation({
    mutationFn: async () => {
      const nextFollowed = !followed;
      try {
        if (followed) {
          await authorFollowsApi.unfollow(normalizedAuthorId);
        } else {
          await authorFollowsApi.follow(normalizedAuthorId);
        }
        return nextFollowed;
      } catch (requestError) {
        // 后端可能已提交关注状态，但在构造响应时返回 5xx。
        // 只有回查确认目标状态已生效才按成功收敛，否则保留原始错误。
        try {
          const actualFollowed = await authorFollowsApi.getState(
            normalizedAuthorId,
          );
          if (actualFollowed === nextFollowed) return actualFollowed;
        } catch {
          // 回查失败不应覆盖原始请求错误。
        }
        throw requestError;
      }
    },
    onSuccess: (nextFollowed) => {
      queryClient.setQueryData(
        authorFollowKeys.state(normalizedAuthorId),
        nextFollowed,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: authorFollowKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ["search"] }),
        queryClient.invalidateQueries({ queryKey: ["discovery"] }),
        queryClient.invalidateQueries({ queryKey: ["authors"] }),
        queryClient.invalidateQueries({ queryKey: ["booklists"] }),
      ]);
      notifySuccess(nextFollowed ? "已关注这位作者" : "已取消关注这位作者");
    },
    onError: (error) => {
      notifyError(
        extractErrorMessage(
          error,
          followed ? "取消关注作者失败，请稍后再试" : "关注作者失败，请稍后再试",
        ),
      );
    },
  });
}
