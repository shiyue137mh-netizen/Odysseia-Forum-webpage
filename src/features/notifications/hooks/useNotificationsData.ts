import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  notificationsApi,
  type DynamicNotificationList,
  type NotificationsQueryParams,
} from "@/features/notifications/api/notificationsApi";
import { notificationKeys } from "@/features/notifications/lib/queryKeys";

const NOTIFICATION_PAGE_SIZE = 20;
const PREVIEW_LIMIT = 5;

interface EnabledOption {
  enabled?: boolean;
}

interface NotificationsListOptions
  extends Pick<NotificationsQueryParams, "unreadOnly"> {
  authorId?: string;
}

async function loadNotificationsByAuthor(
  authorId: string,
  unreadOnly: boolean,
  signal?: AbortSignal,
): Promise<DynamicNotificationList> {
  const limit = 100;
  let offset = 0;
  const results: DynamicNotificationList["results"] = [];

  // ponytail: 后端通知列表暂无 author_id 筛选；选中作者时扫描当前未读条件下的全部分页。
  // 后端支持精确筛选后，删除该扫描并恢复普通分页。
  while (true) {
    const page = await notificationsApi.list(
      { limit, offset, unreadOnly },
      signal,
    );
    results.push(
      ...page.results.filter(
        (item) => String(item.thread.author?.id ?? "") === authorId,
      ),
    );
    offset += page.results.length;
    if (page.results.length === 0 || offset >= page.total) break;
  }

  return {
    results,
    total: results.length,
    unread_count: results.filter((item) => item.read_at == null).length,
    limit: results.length,
    offset: 0,
  };
}

export function useNotificationsList(
  { unreadOnly = false, authorId }: NotificationsListOptions = {},
  { enabled = true }: EnabledOption = {},
) {
  const normalizedAuthorId = /^\d+$/.test(authorId ?? "")
    ? authorId
    : undefined;

  return useInfiniteQuery({
    queryKey: notificationKeys.list({
      limit: normalizedAuthorId ? 100 : NOTIFICATION_PAGE_SIZE,
      unreadOnly,
      authorId: normalizedAuthorId,
    }),
    queryFn: ({ pageParam, signal }) =>
      normalizedAuthorId
        ? loadNotificationsByAuthor(normalizedAuthorId, unreadOnly, signal)
        : notificationsApi.list(
            {
              limit: NOTIFICATION_PAGE_SIZE,
              offset: pageParam,
              unreadOnly,
            },
            signal,
          ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.results.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useNotificationPreview({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: notificationKeys.list({ limit: PREVIEW_LIMIT }),
    queryFn: ({ signal }) =>
      notificationsApi.list({ limit: PREVIEW_LIMIT, offset: 0 }, signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useNotificationUnreadCount({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: ({ signal }) => notificationsApi.getUnreadCount(signal),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

function invalidateNotificationConsumers(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["search"] }),
    queryClient.invalidateQueries({ queryKey: ["discovery"] }),
    queryClient.invalidateQueries({ queryKey: ["authors"] }),
    queryClient.invalidateQueries({ queryKey: ["follows", "list"] }),
    queryClient.invalidateQueries({
      queryKey: ["follows", "unread-count"],
    }),
    queryClient.invalidateQueries({ queryKey: ["booklists"] }),
  ]);
}

export function useMarkThreadNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markThreadRead,
    onSuccess: () => {
      void invalidateNotificationConsumers(queryClient);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      void invalidateNotificationConsumers(queryClient);
    },
  });
}
