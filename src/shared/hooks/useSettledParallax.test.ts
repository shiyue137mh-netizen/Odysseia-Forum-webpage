import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSettledParallax } from "./useSettledParallax";

describe("useSettledParallax", () => {
  beforeEach(() => {
    vi.stubGlobal("DeviceOrientationEvent", undefined);
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  it("目标稳定后停止申请动画帧", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
    const renderTransform = vi.fn();
    const { result } = renderHook(() => useSettledParallax(renderTransform));

    act(() => result.current({ x: 1, y: 0 }));

    for (let index = 0; index < 220 && frames.size > 0; index += 1) {
      const [id, callback] = frames.entries().next().value!;
      frames.delete(id);
      act(() => callback(index * 16));
    }

    expect(renderTransform).toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
});
