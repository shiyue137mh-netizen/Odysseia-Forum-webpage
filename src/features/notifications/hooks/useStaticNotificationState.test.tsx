import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useStaticNotificationState } from "./useStaticNotificationState";

describe("useStaticNotificationState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("在同一窗口同步公告已读、关闭与确认状态", () => {
    const { result } = renderHook(() => ({
      first: useStaticNotificationState(),
      second: useStaticNotificationState(),
    }));

    act(() => {
      result.current.first.markOpenedAt("2026-08-28T10:00:00Z");
      result.current.first.dismiss("notice-1");
      result.current.first.acknowledge("notice-2");
    });

    expect(result.current.second.lastOpenedAt).toBe("2026-08-28T10:00:00Z");
    expect(result.current.second.dismissedIds).toContain("notice-1");
    expect(result.current.second.acknowledgedIds).toContain("notice-2");
  });

  it("不会用更早的公告时间倒退已读边界", () => {
    const { result } = renderHook(() => useStaticNotificationState());

    act(() => {
      result.current.markOpenedAt("2026-08-28T10:00:00Z");
      result.current.markOpenedAt("2026-08-28T09:00:00Z");
    });

    expect(result.current.lastOpenedAt).toBe("2026-08-28T10:00:00Z");
  });
});
