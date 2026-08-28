import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/api/client";
import { bannerApi } from "./bannerApi";

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("bannerApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("按线上契约发送 thread_link，并允许省略封面", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "ok" },
    });
    const payload = {
      thread_link: "123456789012345678",
      target_scope: "global",
    };

    await bannerApi.apply(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/banner/apply", payload);
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty(
      "thread_id",
    );
  });
});
