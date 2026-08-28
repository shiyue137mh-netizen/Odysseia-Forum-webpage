import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Thread } from "@/entities/thread/types";
import { render } from "@/tests/test-utils";
import { ThreadResultsCollection } from "./ThreadResultsCollection";

vi.mock("@/features/threads/components/ThreadCard", () => ({
  ThreadCard: ({
    thread,
    onApplyBanner,
  }: {
    thread: Thread;
    onApplyBanner?: (thread: Thread) => void;
  }) => (
    <button type="button" onClick={() => onApplyBanner?.(thread)}>
      卡片申请 Banner
    </button>
  ),
}));
vi.mock("@/features/threads/components/ThreadListItem", () => ({
  ThreadListItem: ({
    thread,
    onApplyBanner,
  }: {
    thread: Thread;
    onApplyBanner?: (thread: Thread) => void;
  }) => (
    <button type="button" onClick={() => onApplyBanner?.(thread)}>
      列表申请 Banner
    </button>
  ),
}));
vi.mock("@/shared/hooks/useSettings", () => ({
  useLayoutMode: () => "grid",
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

describe("ThreadResultsCollection Banner 入口", () => {
  it.each([
    ["grid", "卡片申请 Banner"],
    ["list", "列表申请 Banner"],
    ["masonry", "卡片申请 Banner"],
  ] as const)("%s 布局传递当前作品", (layoutMode, buttonName) => {
    const onApplyBanner = vi.fn();
    render(
      <ThreadResultsCollection
        threads={[thread]}
        layoutMode={layoutMode}
        onApplyBanner={onApplyBanner}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    expect(onApplyBanner).toHaveBeenCalledWith(thread);
  });
});
