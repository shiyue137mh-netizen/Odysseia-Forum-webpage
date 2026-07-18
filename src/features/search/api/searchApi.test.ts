import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import { searchApi } from "./searchApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: { post: vi.fn() },
}));

describe("searchApi 作者 Token", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { total: 0, results: [] },
    });
  });

  it("把正反作者 ID 放进对应请求字段", async () => {
    await searchApi.search({ query: "$author:123$ -$author:456$" });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/search/",
      expect.objectContaining({
        include_authors: ["123"],
        exclude_authors: ["456"],
      }),
    );
  });

  it("把筛选 token 转换成日期和互动范围", async () => {
    await searchApi.search({
      query: "$date:2026-07-01..2026-08-01$ $likes:10000+$ $replies:1000+$",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/search/",
      expect.objectContaining({
        created_after: "2026-07-01",
        created_before: "2026-08-01",
        reaction_count_range: "[10000, 10000000)",
        reply_count_range: "[1000, 10000000)",
      }),
    );
  });
});
