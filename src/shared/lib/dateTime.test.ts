import { afterEach, describe, expect, it, vi } from "vitest";

import { formatRelativeDateTime } from "./dateTime";

describe("formatRelativeDateTime", () => {
  afterEach(() => vi.useRealTimers());

  it("只输出简短的相对时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00Z"));

    expect(formatRelativeDateTime("2026-07-13T11:55:00Z")).toBe("5分钟前");
  });
});
