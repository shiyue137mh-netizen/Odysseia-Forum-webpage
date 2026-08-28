import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThreadCard } from "@/features/threads/components/ThreadCard";
import { ThreadListItem } from "@/features/threads/components/ThreadListItem";
import type { Thread } from "@/entities/thread/types";
import { render } from "@/tests/test-utils";

vi.mock("@/features/threads/lib/thumbnailRepairQueue", () => ({
  subscribeThreadThumbnailRepair: vi.fn(() => vi.fn()),
}));

const thread = {
  thread_id: "thread-1",
  channel_id: "channel-1",
  guild_id: "guild-1",
  title: "无障碍测试帖子",
  author: {
    id: "author-1",
    name: "author",
    display_name: "测试作者",
  },
  tags: ["测试"],
  virtual_tags: [],
  thumbnail_urls: [],
  first_message_excerpt: "保留卡片快捷操作。",
  created_at: "2026-08-23T00:00:00Z",
  last_active_at: "2026-08-23T00:00:00Z",
  reply_count: 3,
  reaction_count: 12,
  collected_flag: false,
  has_update: false,
} as unknown as Thread;

function expectAccessibleShortcut(element: HTMLElement) {
  expect(element).not.toHaveAttribute("tabindex", "-1");
  expect(element.closest('[aria-hidden="true"]')).toBeNull();
}

describe("帖子卡片无障碍入口", () => {
  it.each([
    ["网格卡片", ThreadCard],
    ["列表卡片", ThreadListItem],
  ] as const)("%s 保留详情和快捷操作的独立入口", (_name, Card) => {
    const onPreview = vi.fn();
    const { unmount } = render(
      <Card thread={thread} onPreview={onPreview} animateIn={false} />,
    );

    const preview = screen.getByRole("button", {
      name: "预览帖子：无障碍测试帖子",
    });
    fireEvent.click(preview);
    expect(onPreview).toHaveBeenCalledTimes(1);

    const author = screen.getAllByRole("button", {
      name: "查看作者：测试作者",
    })[0];
    const moreActions = screen.getAllByRole("button", {
      name: "更多作品操作",
    })[0];
    const tag = screen.getByRole("button", { name: /^#?测试$/ });
    const discord = screen.getAllByRole("link", { name: /Discord/ })[0];

    [preview, author, moreActions, tag, discord].forEach(expectAccessibleShortcut);

    fireEvent.click(moreActions);
    expect(
      screen.getByRole("menuitem", { name: "加入书单" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /关注作品/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Discord/ })).toBeNull();
    unmount();
  });
});
