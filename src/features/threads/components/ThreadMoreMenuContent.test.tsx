import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Thread } from "@/entities/thread/types";
import { ContextMenu } from "@/shared/ui/ContextMenu";
import { render } from "@/tests/test-utils";
import { ThreadMoreMenuContent } from "./ThreadMoreMenuContent";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/features/follows/hooks/useFollowsData", () => ({
  useToggleThreadFollow: () => ({ isPending: false, mutate: mocks.mutate }),
}));

const thread = {
  thread_id: "987654321098765432",
  channel_id: "111111111111111111",
  title: "测试作品",
  created_at: "2026-08-28T00:00:00Z",
  reaction_count: 0,
  reply_count: 0,
  display_count: 0,
  thumbnail_urls: [],
  tags: [],
  virtual_tags: [],
  collected_flag: false,
  viewer_flags: [],
} as Thread;

function renderMenu(onApplyBanner?: () => void) {
  return render(
    <ContextMenu>
      <ThreadMoreMenuContent
        thread={thread}
        onAddToBooklist={vi.fn()}
        onApplyBanner={onApplyBanner}
      />
    </ContextMenu>,
  );
}

describe("ThreadMoreMenuContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("只有页面注入回调时才显示 Banner 申请入口", () => {
    const onApplyBanner = vi.fn();
    const { unmount } = renderMenu(onApplyBanner);

    fireEvent.click(screen.getByRole("menuitem", { name: "申请 Banner" }));
    expect(onApplyBanner).toHaveBeenCalledTimes(1);

    unmount();
    renderMenu();
    expect(
      screen.queryByRole("menuitem", { name: "申请 Banner" }),
    ).not.toBeInTheDocument();
  });
});
