import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import { booklistsApi } from "./booklistsApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("booklistsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks a thread while keeping the quick list limited to 18 booklists", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [] } });

    await booklistsApi.listMine({
      createByCurrentUser: true,
      pageIndex: 0,
      pageSize: 18,
      sortMethod: 5,
      markThreadId: "1234567890123456789",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/booklist/my/list/page",
      expect.objectContaining({
        params: expect.objectContaining({
          limit: 18,
          offset: 0,
          mark_thread_id: "1234567890123456789",
        }),
      }),
    );
  });

  it("searches tournaments through the public booklist endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [] } });

    await booklistsApi.listPublic({
      keywords: "绘画",
      isTournament: true,
      pageIndex: 1,
      pageSize: 12,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/booklist/list/page",
      expect.objectContaining({
        params: expect.objectContaining({
          keywords: "绘画",
          is_tournament: true,
          limit: 12,
          offset: 12,
        }),
      }),
    );
  });

  it("sends a Snowflake ID to sync without converting it to a number", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const payload = {
      thread_id: "1234567890123456789",
      scope_booklist_ids: [1, 2],
      target_booklist_ids: [2],
    };

    await booklistsApi.syncItems(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/booklist/item/sync", payload);
    const sentPayload = vi.mocked(apiClient.post).mock.calls[0][1] as {
      thread_id: unknown;
    };
    expect(typeof sentPayload.thread_id).toBe("string");
  });
});
