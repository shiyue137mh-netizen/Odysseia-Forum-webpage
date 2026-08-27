import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeviceOrientationParallax } from "./useDeviceOrientationParallax";

describe("useDeviceOrientationParallax", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("卸载后权限异步返回也不会注册方向监听器", async () => {
    let resolvePermission!: (value: "granted" | "denied") => void;
    const requestPermission = vi.fn(
      () =>
        new Promise<"granted" | "denied">((resolve) => {
          resolvePermission = resolve;
        }),
    );
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission });
    const addEventListener = vi.spyOn(window, "addEventListener");
    const targetRef = { current: { x: 0, y: 0 } };

    const { unmount } = renderHook(() =>
      useDeviceOrientationParallax(targetRef),
    );
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    unmount();

    await act(async () => {
      resolvePermission("granted");
      await Promise.resolve();
    });

    expect(
      addEventListener.mock.calls.filter(
        ([type]) => type === "deviceorientation",
      ),
    ).toHaveLength(0);
  });

  it("授权成功时注册方向监听器，并在卸载时移除", async () => {
    const requestPermission = vi.fn(() => Promise.resolve<"granted">("granted"));
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission });
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const targetRef = { current: { x: 0, y: 0 } };

    const { unmount } = renderHook(() =>
      useDeviceOrientationParallax(targetRef),
    );
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    await act(async () => {
      await Promise.resolve();
    });
    unmount();

    expect(
      addEventListener.mock.calls.some(
        ([type]) => type === "deviceorientation",
      ),
    ).toBe(true);
    expect(
      removeEventListener.mock.calls.some(
        ([type]) => type === "deviceorientation",
      ),
    ).toBe(true);
  });
});
