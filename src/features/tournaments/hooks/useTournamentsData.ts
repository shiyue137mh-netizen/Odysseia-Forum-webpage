import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { booklistsApi } from "@/features/booklists/api/booklistsApi";
import { booklistKeys } from "@/features/booklists/lib/queryKeys";

/**
 * 赛事本质上就是 is_tournament 为真的书单，走的是同一套后端接口。
 * 因此这里直接复用 booklistsApi 与 booklistKeys —— 不要再起一套平行的 key 空间，
 * 否则书单侧的每次写操作都得手工双份失效缓存，漏一处就是脏数据。
 * （此前的 tournamentsApi 只是 booklistsApi 的转发层，还造成了
 *   booklists ⇄ tournaments 的循环依赖，已删除。）
 */

const TOURNAMENT_ITEMS_PAGE_SIZE = 24;

export function useTournamentsList(params: {
  pageIndex: number;
  pageSize: number;
  sortMethod: number;
  sortOrder?: "asc" | "desc";
  keywords?: string;
}) {
  const listParams = {
    scope: "public" as const,
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sortMethod: params.sortMethod,
    sortOrder: params.sortOrder,
    keywords: params.keywords,
    isTournament: true,
  };

  return useQuery({
    queryKey: booklistKeys.list(listParams),
    queryFn: () =>
      booklistsApi.listPublic({
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
        sortMethod: params.sortMethod,
        sortOrder: params.sortOrder,
        keywords: params.keywords,
        isTournament: true,
      }),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useTournamentDetail(booklistId: string | number) {
  const enabled = /^\d+$/.test(String(booklistId));

  return useQuery({
    queryKey: booklistKeys.detail(booklistId),
    queryFn: () => booklistsApi.getDetail(booklistId),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useTournamentItems(booklistId: string | number) {
  const enabled = /^\d+$/.test(String(booklistId));

  return useInfiniteQuery({
    queryKey: booklistKeys.items(booklistId),
    queryFn: ({ pageParam }) =>
      booklistsApi.listItems(booklistId, {
        limit: TOURNAMENT_ITEMS_PAGE_SIZE,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.results || lastPage.results.length === 0) return undefined;
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < (lastPage.total || 0) ? nextOffset : undefined;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
