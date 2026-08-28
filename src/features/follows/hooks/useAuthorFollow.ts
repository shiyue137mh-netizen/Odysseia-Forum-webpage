import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authorFollowsApi } from "@/features/follows/api/authorFollowsApi";
import { authorFollowKeys } from "@/features/follows/lib/queryKeys";
import { notifyError, notifySuccess } from "@/features/mascot/lib/notify";
import { extractErrorMessage } from "@/shared/lib/notify";

interface AuthorFollowStateOptions {
  enabled?: boolean;
  initialFollowed?: boolean;
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
      if (followed) {
        await authorFollowsApi.unfollow(normalizedAuthorId);
        return false;
      }
      const state = await authorFollowsApi.follow(normalizedAuthorId);
      return state.active;
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
