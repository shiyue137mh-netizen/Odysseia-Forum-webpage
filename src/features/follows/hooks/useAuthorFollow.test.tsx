import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authorFollowsApi } from "@/features/follows/api/authorFollowsApi";
import { notifyError, notifySuccess } from "@/features/mascot/lib/notify";
import { useToggleAuthorFollow } from "./useAuthorFollow";

vi.mock("@/features/follows/api/authorFollowsApi", () => ({
  authorFollowsApi: {
    follow: vi.fn(),
    unfollow: vi.fn(),
    getState: vi.fn(),
  },
}));

vi.mock("@/features/mascot/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useToggleAuthorFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("请求返回 5xx 但状态已落库时按成功收敛", async () => {
    vi.mocked(authorFollowsApi.follow).mockRejectedValue(
      new Error("Internal Server Error"),
    );
    vi.mocked(authorFollowsApi.getState).mockResolvedValue(true);

    const { result } = renderHook(
      () => useToggleAuthorFollow("123456789012345678", false),
      { wrapper: createWrapper() },
    );

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authorFollowsApi.getState).toHaveBeenCalledWith(
      "123456789012345678",
    );
    expect(notifySuccess).toHaveBeenCalledWith("已关注这位作者");
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("回查确认目标状态未生效时保留原始失败", async () => {
    const requestError = new Error("Internal Server Error");
    vi.mocked(authorFollowsApi.follow).mockRejectedValue(requestError);
    vi.mocked(authorFollowsApi.getState).mockResolvedValue(false);

    const { result } = renderHook(
      () => useToggleAuthorFollow("123456789012345678", false),
      { wrapper: createWrapper() },
    );

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(requestError);
    expect(notifyError).toHaveBeenCalledOnce();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
