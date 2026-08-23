import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { booklistsApi } from "@/features/booklists/api/booklistsApi";
import {
  booklistKeys,
  type BooklistScope,
} from "@/features/booklists/lib/queryKeys";
import type {
  BooklistFormInput,
  BooklistItemAddInput,
  BooklistItemUpdateInput,
  BooklistPublishRequest,
} from "@/entities/booklist/types";
import { notifyError, notifySuccess } from "@/features/mascot/lib/notify";
import { extractErrorMessage } from "@/shared/lib/notify";

export function useBooklistsList(params: {
  scope: BooklistScope;
  keywords?: string;
  sortMethod: number;
  pageIndex: number;
  pageSize: number;
  isTournament?: boolean;
  ownerId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: booklistKeys.list({
      scope: params.scope,
      keywords: params.keywords,
      sortMethod: params.sortMethod,
      pageIndex: params.pageIndex,
      pageSize: params.pageSize,
      isTournament: params.isTournament,
      ownerId: params.ownerId,
    }),
    queryFn: async () => {
      if (params.scope === "public") {
        return booklistsApi.listPublic({
          keywords: params.keywords,
          sortMethod: params.sortMethod,
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
          isTournament: params.isTournament,
          ownerId: params.ownerId,
        });
      }

      return booklistsApi.listMine({
        keywords: params.keywords,
        sortMethod: params.sortMethod,
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
        isTournament: params.isTournament,
        createByCurrentUser: params.scope === "mine",
        collectByCurrentUser: params.scope === "collected",
      });
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    enabled: params.enabled ?? true,
  });
}

export function useMyBooklistsList(
  options: {
    markThreadId?: string;
    enabled?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: [
      ...booklistKeys.mineLists(),
      "mine",
      { markThreadId: options.markThreadId },
    ],
    queryFn: () =>
      booklistsApi.listMine({
        createByCurrentUser: true,
        pageIndex: 0,
        pageSize: 18,
        sortMethod: 5,
        markThreadId: options.markThreadId,
      }),
    enabled: options.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useCollectedBooklistsList() {
  return useQuery({
    queryKey: [...booklistKeys.mineLists(), "collected"],
    queryFn: () =>
      booklistsApi.listMine({
        collectByCurrentUser: true,
        pageIndex: 0,
        pageSize: 18,
        sortMethod: 6,
      }),
    staleTime: 60 * 1000,
  });
}

export function useMyTournamentsList() {
  return useQuery({
    queryKey: [...booklistKeys.mineLists(), "tournaments"],
    queryFn: () =>
      booklistsApi.listMine({
        createByCurrentUser: true,
        pageIndex: 0,
        pageSize: 48,
        sortMethod: 5,
        isTournament: true,
      }),
    select: (data) => ({
      ...data,
      results: (data.results || []).filter((item) => item.is_tournament),
    }),
    staleTime: 60 * 1000,
  });
}

export function useBooklistDetail(booklistId: number | string) {
  return useQuery({
    queryKey: booklistKeys.detail(booklistId),
    queryFn: () => booklistsApi.getDetail(booklistId),
    enabled: /^\d+$/.test(String(booklistId)),
    staleTime: 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.publish_status === 1 ? 3_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useBooklistItems(booklistId: number | string) {
  return useInfiniteQuery({
    queryKey: booklistKeys.items(booklistId),
    queryFn: ({ pageParam }) =>
      booklistsApi.listItems(booklistId, {
        limit: 24,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      // 书单接口的 total 是总条目数，使用标准 offset 分页
      if (!lastPage.results || lastPage.results.length === 0) return undefined;
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < (lastPage.total || 0) ? nextOffset : undefined;
    },
    enabled: /^\d+$/.test(String(booklistId)),
    staleTime: 60 * 1000,
  });
}

function useInvalidateBooklists() {
  const queryClient = useQueryClient();

  return (booklistId?: number | string) => {
    queryClient.invalidateQueries({ queryKey: booklistKeys.all });
    if (booklistId !== undefined && /^\d+$/.test(String(booklistId))) {
      queryClient.invalidateQueries({
        queryKey: booklistKeys.detail(booklistId),
      });
      queryClient.invalidateQueries({
        queryKey: booklistKeys.items(booklistId),
      });
    }
  };
}

export function useToggleBooklistCollection() {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: ({ id, collected }: { id: number; collected: boolean }) =>
      collected
        ? booklistsApi.uncollect([String(id)])
        : booklistsApi.collect([String(id)]),
    onSuccess: (_, variables) => {
      invalidateBooklists(variables.id);
    },
    onError: (error) =>
      notifyError(extractErrorMessage(error, "书单收藏状态更新失败")),
  });
}

export function useCreateBooklist(onSuccess?: () => void) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: (payload: BooklistFormInput) => booklistsApi.create(payload),
    onSuccess: () => {
      notifySuccess("书单创建成功");
      invalidateBooklists();
      onSuccess?.();
    },
    onError: (error) => notifyError(extractErrorMessage(error, "书单创建失败")),
  });
}

export function useUpdateBooklist(booklistId?: number, onSuccess?: () => void) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: number;
      payload: Partial<BooklistFormInput>;
    }) => booklistsApi.update(id ?? booklistId!, payload),
    onSuccess: (_, variables) => {
      notifySuccess("书单已更新");
      invalidateBooklists(variables.id ?? booklistId);
      onSuccess?.();
    },
    onError: (error) => notifyError(extractErrorMessage(error, "书单更新失败")),
  });
}

export function useDeleteBooklist(onSuccess?: () => void) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: (id: number) => booklistsApi.remove(id),
    onSuccess: (_, id) => {
      notifySuccess("书单已删除");
      invalidateBooklists(id);
      onSuccess?.();
    },
    onError: (error) => notifyError(extractErrorMessage(error, "删除书单失败")),
  });
}

export function usePublishBooklist(
  booklistId: number | string,
  onSuccess?: () => void,
) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: (payload: BooklistPublishRequest) =>
      booklistsApi.publish(booklistId, payload),
    onSuccess: () => {
      notifySuccess("讨论帖关联请求已提交");
      invalidateBooklists(booklistId);
      onSuccess?.();
    },
    onError: (error) =>
      notifyError(extractErrorMessage(error, "关联讨论帖失败")),
  });
}

export function useUnpublishBooklist(booklistId: number | string) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: () => booklistsApi.unpublish(booklistId),
    onSuccess: () => {
      notifySuccess("已解除讨论帖关联");
      invalidateBooklists(booklistId);
    },
    onError: (error) =>
      notifyError(extractErrorMessage(error, "解除讨论帖关联失败")),
  });
}

export function useAddBooklistItems(
  booklistId: number | string,
  onSuccess?: () => void,
) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: (items: BooklistItemAddInput[]) =>
      booklistsApi.addItems(booklistId, items),
    onSuccess: () => {
      notifySuccess("帖子已加入书单");
      invalidateBooklists(booklistId);
      onSuccess?.();
    },
    onError: (error) =>
      notifyError(extractErrorMessage(error, "添加帖子到书单失败")),
  });
}

export function useRemoveBooklistItems(booklistId: number | string) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: (threadId: string | number) =>
      booklistsApi.removeItems(booklistId, [String(threadId)]),
    onSuccess: () => {
      notifySuccess("书单条目已移除");
      invalidateBooklists(booklistId);
    },
    onError: (error) =>
      notifyError(extractErrorMessage(error, "移除书单条目失败")),
  });
}

export function useUpdateBooklistItem(
  booklistId: number | string,
  onSuccess?: () => void,
) {
  const invalidateBooklists = useInvalidateBooklists();

  return useMutation({
    mutationFn: ({
      threadId,
      payload,
    }: {
      threadId: string | number;
      payload: BooklistItemUpdateInput;
    }) => booklistsApi.updateItem(booklistId, threadId, payload),
    onSuccess: () => {
      notifySuccess("书单条目已更新");
      invalidateBooklists(booklistId);
      onSuccess?.();
    },
    onError: (error) =>
      notifyError(extractErrorMessage(error, "更新书单条目失败")),
  });
}
