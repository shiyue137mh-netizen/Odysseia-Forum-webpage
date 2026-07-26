import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "./authApi";
import { apiClient } from "@/shared/api/client";
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  setUseAuthHeader,
} from "@/shared/lib/authSession";

vi.mock("@/shared/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock("@/shared/lib/authSession", () => ({
  clearStoredAuthToken: vi.fn(),
  getStoredAuthToken: vi.fn(),
  setUseAuthHeader: vi.fn(),
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedGetToken = vi.mocked(getStoredAuthToken);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authApi.checkAuth", () => {
  it("cookie 会话有效时直接返回，并关闭 Bearer 模式", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { loggedIn: true, user: { id: "1", username: "snake" } },
    });

    const result = await authApi.checkAuth();

    expect(result.loggedIn).toBe(true);
    expect(result.user?.id).toBe("1");
    expect(setUseAuthHeader).toHaveBeenCalledWith(false);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("cookie 无效且本地无 token 时返回未登录", async () => {
    mockedGet.mockResolvedValueOnce({ data: { loggedIn: false } });
    mockedGetToken.mockReturnValueOnce(null);

    const result = await authApi.checkAuth();

    expect(result).toEqual({ loggedIn: false });
    expect(setUseAuthHeader).not.toHaveBeenCalled();
  });

  it("cookie 无效但本地 token 有效时回退到 Bearer 模式", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { loggedIn: false } })
      .mockResolvedValueOnce({
        data: { loggedIn: true, user: { id: "2", username: "fallback" } },
      });
    mockedGetToken.mockReturnValueOnce("stored-token");

    const result = await authApi.checkAuth();

    expect(result.loggedIn).toBe(true);
    expect(setUseAuthHeader).toHaveBeenCalledWith(true);
    expect(mockedGet).toHaveBeenLastCalledWith("/auth/checkauth", {
      headers: { Authorization: "Bearer stored-token" },
      skipAuthHeader: true,
    });
  });

  it("cookie 请求抛错时同样走 Bearer 回退", async () => {
    mockedGet
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        data: { loggedIn: true, user: { id: "3", username: "recovered" } },
      });
    mockedGetToken.mockReturnValueOnce("stored-token");

    const result = await authApi.checkAuth();

    expect(result.loggedIn).toBe(true);
    expect(setUseAuthHeader).toHaveBeenCalledWith(true);
  });

  it("cookie 与 Bearer 双双失败时返回未登录且不抛错", async () => {
    mockedGet
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("token expired"));
    mockedGetToken.mockReturnValueOnce("stale-token");

    const result = await authApi.checkAuth();

    expect(result).toEqual({ loggedIn: false });
    expect(setUseAuthHeader).not.toHaveBeenCalled();
  });
});

describe("authApi.logout", () => {
  it("调用登出接口并清理本地会话状态", async () => {
    mockedGet.mockResolvedValueOnce({ data: {} });

    await authApi.logout();

    expect(mockedGet).toHaveBeenCalledWith("/auth/logout");
    expect(clearStoredAuthToken).toHaveBeenCalledTimes(1);
    expect(setUseAuthHeader).toHaveBeenCalledWith(false);
  });
});
