import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { followsApi } from "@/features/follows/api/followsApi";
import { useToggleThreadFollow } from "@/features/follows/hooks/useFollowsData";
import { followsKeys } from "@/features/follows/lib/queryKeys";

vi.mock("@/features/follows/api/followsApi", () => ({
  followsApi: {
    followThread: vi.fn(),
    unfollowThread: vi.fn(),
  },
}));

vi.mock("@/features/mascot/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useToggleThreadFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("关注成功后保留可供菜单重新打开使用的状态", async () => {
    vi.mocked(followsApi.followThread).mockResolvedValue();
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(() => useToggleThreadFollow(), { wrapper });

    act(() =>
      result.current.mutate({ threadId: "123456789012345678", followed: false }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(followsKeys.state("123456789012345678"))).toBe(
      true,
    );
  });

  it("请求失败时回滚乐观关注状态", async () => {
    vi.mocked(followsApi.followThread).mockRejectedValue(new Error("failed"));
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(() => useToggleThreadFollow(), { wrapper });

    act(() =>
      result.current.mutate({ threadId: "123456789012345678", followed: false }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(followsKeys.state("123456789012345678"))).toBe(
      false,
    );
  });
});
