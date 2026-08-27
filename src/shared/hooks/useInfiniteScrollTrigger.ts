import { useEffect, useRef } from 'react';

interface InfiniteQueryLike {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError?: boolean;
  fetchNextPage: () => unknown;
}

interface Options {
  /** 提前多少距离触发加载，默认 200px */
  rootMargin?: string;
  /** 为 false 时不挂载观察器（例如当前不是无限滚动模式） */
  enabled?: boolean;
}

/**
 * 无限滚动的哨兵 ref：把返回的 ref 挂在列表底部的占位元素上，
 * 它进入视口时自动 fetchNextPage。
 *
 * 提取自 SearchPage / BooklistDetailPage / TournamentDetailPage / TournamentManagePage
 * 四处逐字重复的实现（rootMargin 当时还不一致，分别是 360px 与 200px）。
 */
export function useInfiniteScrollTrigger(
  query: InfiniteQueryLike,
  { rootMargin = '200px', enabled = true }: Options = {},
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError = false, fetchNextPage } = query;

  useEffect(() => {
    if (!enabled) return;

    const target = sentinelRef.current;
    if (!target || !hasNextPage || isFetchNextPageError) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
          fetchNextPage();
        }
      },
      { rootMargin },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, rootMargin]);

  return sentinelRef;
}
