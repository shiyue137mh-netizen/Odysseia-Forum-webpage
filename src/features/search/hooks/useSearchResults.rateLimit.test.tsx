import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchResponse } from "@/entities/thread/types";
import { searchApi } from "@/features/search/api/searchApi";
import type { SearchParams } from "@/features/search/hooks/useSearchParams";
import {
  RateLimitError,
  rememberRateLimit,
  resetRateLimitStateForTests,
  type RateLimitOrigin,
} from "@/shared/api/rateLimit";
import { notifyRateLimit } from "@/shared/lib/notify";
import { useSearchResults } from "./useSearchResults";

vi.mock("@/features/search/api/searchApi", () => ({
  searchApi: { search: vi.fn() },
}));

const settings = vi.hoisted(() => ({
  pagingMode: "infinite" as "infinite" | "pagination",
  preload: { enabled: true, pages: 2 },
}));

vi.mock("@/shared/hooks/useSettings", () => ({
  useResultPagingModeSetting: () => settings.pagingMode,
  useResultPreloadSettings: () => settings.preload,
}));

vi.mock("@/shared/lib/notify", () => ({
  notifyRateLimit: vi.fn(),
}));

const params: SearchParams = {
  query: "",
  channel: null,
  type: "thread",
  sortMethod: "last_active_desc",
  sortOrder: "desc",
  page: 1,
  includeTags: [],
  excludeTags: [],
  includeAuthors: [],
  excludeAuthors: [],
  tagLogic: "and",
  timeFrom: "",
  timeTo: "",
  reactionMin: null,
  replyMin: null,
};

const page = (ids: string[], total = 10) =>
  ({
    total,
    limit: 24,
    offset: 0,
    results: ids.map((threadId) => ({ thread_id: threadId })),
    available_tags: [],
    virtual_tags: [],
  }) as unknown as SearchResponse;

function rateLimit(origin: RateLimitOrigin) {
  return rememberRateLimit({
    scope: "search",
    origin,
    retryAfterSeconds: 5,
    retryAt: Date.now() + 5_000,
  });
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useSearchResults 限流分层", () => {
  beforeEach(() => {
    resetRateLimitStateForTests();
    vi.clearAllMocks();
    settings.pagingMode = "infinite";
    settings.preload = { enabled: true, pages: 2 };
  });

  afterEach(() => {
    resetRateLimitStateForTests();
    vi.restoreAllMocks();
  });

  it("后台预加载 429 时保留当前结果并静默暂停", async () => {
    vi.mocked(searchApi.search)
      .mockResolvedValueOnce(page(["1"]))
      .mockImplementationOnce(async () => {
        throw new RateLimitError(rateLimit("preload"));
      });

    const { result } = renderHook(
      () => useSearchResults({ params, preferences: null }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(searchApi.search).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.infiniteQueryState.isFetchNextPageError).toBe(true),
    );

    expect(result.current.results).toHaveLength(1);
    expect(result.current.visibleRateLimit).toBeNull();
    expect(notifyRateLimit).not.toHaveBeenCalled();

    await act(async () => result.current.requestNextPage());
    expect(searchApi.search).toHaveBeenCalledTimes(2);
    expect(result.current.visibleRateLimit?.remaining).toBeGreaterThan(0);
    expect(notifyRateLimit).toHaveBeenCalledTimes(1);
  });

  it("第一批搜索 429 时立即提供页面限流状态", async () => {
    vi.mocked(searchApi.search).mockImplementationOnce(async () => {
      throw new RateLimitError(rateLimit("foreground"));
    });

    const { result } = renderHook(
      () => useSearchResults({ params, preferences: null }),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(result.current.infiniteQueryState.isError).toBe(true),
    );
    await waitFor(() => expect(result.current.visibleRateLimit).not.toBeNull());
    expect(result.current.results).toHaveLength(0);
  });

  it("分页请求 429 后，冷却结束再次翻页会重新请求", async () => {
    settings.pagingMode = "pagination";
    settings.preload = { enabled: false, pages: 2 };
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.mocked(searchApi.search)
      .mockResolvedValueOnce(page(["1"]))
      .mockImplementationOnce(async () => {
        throw new RateLimitError(rateLimit("foreground"));
      })
      .mockResolvedValueOnce(page(["2"]));

    let currentParams = params;
    const { result, rerender } = renderHook(
      () => useSearchResults({ params: currentParams, preferences: null }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    currentParams = { ...params, page: 2 };
    rerender();
    await waitFor(() =>
      expect(result.current.infiniteQueryState.isFetchNextPageError).toBe(true),
    );

    currentParams = params;
    rerender();
    now += 6_000;
    expect(result.current.preparePageRequest(2)).toBe(true);
    currentParams = { ...params, page: 2 };
    rerender();

    await waitFor(() => expect(searchApi.search).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.results[0]?.thread_id).toBe("2"));
  });
});
