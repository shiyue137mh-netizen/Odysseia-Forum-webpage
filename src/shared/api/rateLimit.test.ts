import { beforeEach, describe, expect, it } from "vitest";

import {
  getActiveRateLimit,
  getRateLimitInfo,
  parseRetryAfter,
  RateLimitError,
  rememberRateLimit,
  resetRateLimitStateForTests,
  shouldRetryQuery,
} from "./rateLimit";

function axios429(retryAfter?: string, url = "/search/") {
  return {
    isAxiosError: true,
    config: { url },
    response: {
      status: 429,
      headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
    },
  };
}

describe("rateLimit", () => {
  beforeEach(() => resetRateLimitStateForTests());

  it("解析秒数和 HTTP 日期格式的 Retry-After", () => {
    const now = Date.parse("2026-08-15T00:00:00Z");
    expect(parseRetryAfter("5", now)).toBe(5);
    expect(parseRetryAfter("Sat, 15 Aug 2026 00:00:07 GMT", now)).toBe(7);
  });

  it("缺少 Retry-After 时不虚构冷却时间", () => {
    const info = getRateLimitInfo(axios429(), { origin: "preload" });
    expect(info).toMatchObject({
      scope: "search",
      origin: "preload",
      retryAfterSeconds: null,
      retryAt: null,
    });
  });

  it("记录搜索冷却时间并在到期后自动清除", () => {
    const now = 10_000;
    rememberRateLimit({
      scope: "search",
      origin: "preload",
      retryAfterSeconds: 5,
      retryAt: now + 5_000,
    });

    expect(
      getActiveRateLimit("search", "foreground", now + 2_000),
    ).toMatchObject({
      origin: "foreground",
      retryAfterSeconds: 3,
    });
    expect(getActiveRateLimit("search", "foreground", now + 5_000)).toBeNull();
  });

  it("429 不重试，普通错误仍保留一次重试", () => {
    const rateLimit = new RateLimitError({
      scope: "search",
      origin: "foreground",
      retryAfterSeconds: 5,
      retryAt: Date.now() + 5_000,
    });

    expect(shouldRetryQuery(0, rateLimit)).toBe(false);
    expect(shouldRetryQuery(0, new Error("network"))).toBe(true);
    expect(shouldRetryQuery(1, new Error("network"))).toBe(false);
  });
});
