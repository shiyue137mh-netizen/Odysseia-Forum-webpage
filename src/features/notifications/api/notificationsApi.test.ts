import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import { notificationsApi } from "./notificationsApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("notificationsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("按分页与未读筛选请求动态通知", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        results: [],
        total: 0,
        unread_count: 0,
        limit: 20,
        offset: 40,
      },
    });

    await notificationsApi.list({ limit: 20, offset: 40, unreadOnly: true });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/notifications",
      expect.objectContaining({
        params: { limit: 20, offset: 40, unread_only: true },
      }),
    );
  });

  it("按作品标记已读时保持 Snowflake 字符串", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { thread_id: "123456789012345678", marked_read: 1 },
    });

    await notificationsApi.markThreadRead("123456789012345678");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/notifications/threads/123456789012345678/read",
    );
  });

  it("全部已读使用新的动态通知端点", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { marked_read: 3 },
    });

    await notificationsApi.markAllRead();

    expect(apiClient.post).toHaveBeenCalledWith("/notifications/read-all");
  });
});
