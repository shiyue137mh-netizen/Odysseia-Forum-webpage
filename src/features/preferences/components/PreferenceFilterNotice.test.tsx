import { fireEvent, render, screen } from "@/tests/test-utils";
import { describe, expect, it, vi } from "vitest";

import { PreferenceFilterNotice } from "@/features/preferences/components/PreferenceFilterNotice";

describe("PreferenceFilterNotice", () => {
  it("提供忽略和设置操作", () => {
    const onIgnore = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <PreferenceFilterNotice
        onIgnore={onIgnore}
        onRestore={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "暂时忽略偏好过滤" }));
    fireEvent.click(screen.getByRole("button", { name: "调整探索偏好" }));
    expect(onIgnore).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("忽略后提供恢复操作", () => {
    const onRestore = vi.fn();

    render(
      <PreferenceFilterNotice
        ignored
        onIgnore={vi.fn()}
        onRestore={onRestore}
        onOpenSettings={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "恢复偏好过滤" }));
    expect(onRestore).toHaveBeenCalledOnce();
  });
});
