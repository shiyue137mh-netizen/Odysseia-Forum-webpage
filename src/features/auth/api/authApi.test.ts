import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "./authApi";
import { apiClient } from "@/shared/api/client";
import {
  getStoredAuthToken,
  invalidateAuthSession,
  setUseAuthHeader,
} from "@/shared/lib/authSession";

vi.mock("@/shared/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock("@/shared/lib/authSession", () => ({
  getStoredAuthToken: vi.fn(),
  invalidateAuthSession: vi.fn(),
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

  it("cookie 请求失败且没有本地 token 时保留网络错误", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network down"));
    mockedGetToken.mockReturnValueOnce(null);

    await expect(authApi.checkAuth()).rejects.toThrow("network down");
  });

  it("cookie 与 Bearer 双双失败时保留真实错误", async () => {
    mockedGet
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("token expired"));
    mockedGetToken.mockReturnValueOnce("stale-token");

    await expect(authApi.checkAuth()).rejects.toThrow("token expired");
    expect(setUseAuthHeader).not.toHaveBeenCalled();
  });
});

describe("authApi.logout", () => {
  it("调用现有 GET 登出接口，绕过全局 JSON 解析并清理本地会话状态", async () => {
    mockedGet.mockResolvedValueOnce({ data: "<html></html>" });

    await authApi.logout();

    expect(mockedGet).toHaveBeenCalledWith(
      "/auth/logout",
      expect.objectContaining({ transformResponse: expect.any(Function) }),
    );
    expect(invalidateAuthSession).toHaveBeenCalledTimes(1);
  });

  it("后端登出失败时仍清理本地会话状态", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network down"));

    await expect(authApi.logout()).rejects.toThrow("network down");

    expect(invalidateAuthSession).toHaveBeenCalledTimes(1);
  });
});
