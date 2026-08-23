import { fireEvent, render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { ThreadTagItem } from "./ThreadTagItem";

vi.mock("@/features/preferences/hooks/useUserPreferences", () => ({
  useUserPreferences: vi.fn(() => ({
    user: null,
    preferences: null,
    savePreferences: vi.fn(),
  })),
}));

describe("ThreadTagItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("只在右键菜单打开后挂载偏好业务 Hook", () => {
    render(<ThreadTagItem tag="测试标签" />);

    expect(useUserPreferences).not.toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByRole("button", { name: "测试标签" }));

    expect(useUserPreferences).toHaveBeenCalledTimes(1);
    expect(screen.getByText("偏好屏蔽此标签")).toBeInTheDocument();
  });
});
