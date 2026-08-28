import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsApi } from "@/features/notifications/api/notificationsApi";
import { useNotificationsList } from "./useNotificationsData";

vi.mock("@/features/notifications/api/notificationsApi", () => ({
  notificationsApi: { list: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function notification(id: number, authorId: string, readAt: string | null) {
  return {
    id,
    type: "author_new_thread" as const,
    thread: {
      thread_id: String(id),
      title: `作品 ${id}`,
      author: { id: authorId, name: `author-${authorId}` },
    },
    update: null,
    created_at: "2026-08-28T00:00:00Z",
    read_at: readAt,
  };
}

describe("useNotificationsList 作者筛选", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("后端尚无 author_id 参数时扫描全部分页后精确过滤", async () => {
    vi.mocked(notificationsApi.list)
      .mockResolvedValueOnce({
        results: [notification(1, "111", null)],
        total: 2,
        unread_count: 2,
        limit: 100,
        offset: 0,
      } as never)
      .mockResolvedValueOnce({
        results: [notification(2, "222", null)],
        total: 2,
        unread_count: 2,
        limit: 100,
        offset: 1,
      } as never);

    const { result } = renderHook(
      () => useNotificationsList({ authorId: "111" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsApi.list).toHaveBeenNthCalledWith(
      1,
      { limit: 100, offset: 0, unreadOnly: false },
      expect.any(AbortSignal),
    );
    expect(notificationsApi.list).toHaveBeenNthCalledWith(
      2,
      { limit: 100, offset: 1, unreadOnly: false },
      expect.any(AbortSignal),
    );
    expect(result.current.data?.pages[0]).toMatchObject({
      total: 1,
      unread_count: 1,
      results: [expect.objectContaining({ id: 1 })],
    });
    expect(result.current.hasNextPage).toBe(false);
  });
});
