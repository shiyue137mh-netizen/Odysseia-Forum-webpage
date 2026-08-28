import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import { authorFollowsApi } from "./authorFollowsApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("authorFollowsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("分页扫描全部活跃关注以准确判断作者状态", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              author: { id: "1" },
              followed_at: "2026-08-28T00:00:00Z",
              active: true,
            },
          ],
          total: 2,
          limit: 100,
          offset: 0,
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              author: { id: "123456789012345678" },
              followed_at: "2026-08-28T00:00:00Z",
              active: true,
            },
          ],
          total: 2,
          limit: 100,
          offset: 1,
        },
      });

    await expect(
      authorFollowsApi.getState("123456789012345678"),
    ).resolves.toBe(true);
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      "/author-follows",
      expect.objectContaining({
        params: { limit: 100, offset: 1, active: true },
      }),
    );
  });

  it("关注请求保持 Snowflake 字符串", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        author_id: "123456789012345678",
        followed_at: "2026-08-28T00:00:00Z",
        active: true,
      },
    });

    await authorFollowsApi.follow("123456789012345678");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/author-follows/123456789012345678",
    );
  });

  it("取消关注使用同一 Snowflake 路径并接受 204 空响应", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 });

    await expect(
      authorFollowsApi.unfollow("123456789012345678"),
    ).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/author-follows/123456789012345678",
    );
  });
});
