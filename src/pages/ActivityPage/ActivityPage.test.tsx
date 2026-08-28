import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/tests/test-utils";
import { ActivityPage } from "./index";

const mocks = vi.hoisted(() => ({
  openPreview: vi.fn(),
  useAuthorFollowsList: vi.fn(),
  useNotificationsList: vi.fn(),
  useNotificationUnreadCount: vi.fn(),
  markAllMutateAsync: vi.fn(),
  resolveStaticNotifications: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/features/follows/hooks/useAuthorFollow", () => ({
  useAuthorFollowsList: mocks.useAuthorFollowsList,
}));
vi.mock("@/features/notifications/hooks/useNotificationsData", () => ({
  useNotificationsList: mocks.useNotificationsList,
  useNotificationUnreadCount: mocks.useNotificationUnreadCount,
  useMarkAllNotificationsRead: () => ({
    isPending: false,
    mutateAsync: mocks.markAllMutateAsync,
  }),
}));
vi.mock("@/features/notifications/notificationsConfig", () => ({
  resolveStaticNotifications: mocks.resolveStaticNotifications,
}));
vi.mock("@/shared/config/appInfo", () => ({ APP_VERSION: "test" }));
vi.mock("@/features/notifications/components/NotificationAnnouncementModal", () => ({
  NotificationAnnouncementModal: ({
    notification,
    required,
    onClose,
  }: {
    notification: { title: string };
    required: boolean;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={notification.title}>
      {required ? "需要确认" : "普通公告"}
      <button type="button" onClick={onClose}>确认公告</button>
    </div>
  ),
}));
vi.mock("@/features/search/hooks/usePreviewThread", () => ({
  usePreviewThread: () => ({ openPreview: mocks.openPreview }),
}));
vi.mock("@/shared/hooks/useInfiniteScrollTrigger", () => ({
  useInfiniteScrollTrigger: () => ({ current: null }),
}));
vi.mock("@/shared/lib/dateTime", () => ({
  formatRelativeDateTime: (value: string) => value,
}));
vi.mock("@/shared/ui/LazyImage", () => ({
  LazyImage: () => null,
}));

const author = {
  id: "123456789012345678",
  name: "author",
  global_name: null,
  display_name: "测试作者",
  avatar_url: null,
};

const notification = {
  id: 1,
  type: "thread_update",
  thread: {
    thread_id: "987654321098765432",
    channel_id: "channel",
    title: "作品更新标题",
    author,
    created_at: "2026-08-01T00:00:00Z",
    last_active_at: "2026-08-27T00:00:00Z",
    reaction_count: 12,
    reply_count: 3,
    collection_count: 4,
    display_count: 56,
    first_message_excerpt: "这是作品首楼摘要",
    thumbnail_urls: [],
    tags: ["奇幻"],
    virtual_tags: ["长篇"],
    collected_flag: false,
    viewer_flags: ["unread"],
    is_tournament: false,
  },
  update: {
    id: 2,
    description: "新增了一章内容",
    version: "v2",
    message_link: null,
    source_message_at: "2026-08-28T09:00:00Z",
    published_at: "2026-08-28T09:00:00Z",
  },
  created_at: "2026-08-28T09:00:00Z",
  read_at: null,
} as const;

const staticNotification = {
  id: "follow-updates-launch-2026-08-28",
  kind: "release",
  title: "关注与动态功能现已上线",
  message: "现在可以关注作者和作品。",
  created_at: "2026-08-28T10:00:00Z",
  starts_at: "2026-08-28T10:00:00Z",
  expires_at: null,
  presentation: "required",
  acknowledgement: "我已了解关注与动态功能",
  content: {
    title: "关注喜欢的作者与作品",
    message: "系统通知、作品更新与作者新作会集中显示。",
    tags: ["功能更新"],
    virtual_tags: ["activity"],
    thumbnail_urls: [],
    author: { name: "Odysseia Web Team", avatar_url: null },
  },
} as const;

describe("ActivityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.resolveStaticNotifications.mockResolvedValue([staticNotification]);
    mocks.useNotificationUnreadCount.mockReturnValue({
      data: { unread_count: 1 },
    });
    mocks.markAllMutateAsync.mockResolvedValue({ marked_read: 1 });
    mocks.useAuthorFollowsList.mockReturnValue({
      data: {
        pages: [
          {
            results: [
              {
                author,
                followed_at: "2026-08-28T00:00:00Z",
                active: true,
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    });
    mocks.useNotificationsList.mockReturnValue({
      data: {
        pages: [
          {
            results: [notification],
            total: 1,
            unread_count: 1,
            limit: 20,
            offset: 0,
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("展示系统通知、关注作者与最近动态，并可打开作品", async () => {
    render(<ActivityPage />);

    expect(screen.getByRole("heading", { name: "动态" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "管理关注" })).toHaveAttribute(
      "href",
      "/me?tab=follows",
    );
    expect(screen.getByRole("button", { name: "系统通知" })).toBeInTheDocument();
    expect(screen.getAllByText("测试作者").length).toBeGreaterThan(0);
    expect(await screen.findByText("作品更新标题")).toBeInTheDocument();
    expect(screen.getByText("关注喜欢的作者与作品")).toBeInTheDocument();
    expect(screen.getByText("这是作品首楼摘要")).toBeInTheDocument();
    expect(screen.getByText("#奇幻")).toBeInTheDocument();
    expect(screen.getByTitle("浏览")).toHaveTextContent("56");
    expect(screen.getByRole("link", { name: /Discord/ })).toBeInTheDocument();
    expect(screen.getByText("NEW").parentElement?.parentElement).toHaveClass(
      "top-2",
      "right-2",
    );
    expect(
      screen
        .getByRole("button", { name: "更多作品操作" })
        .closest(".absolute"),
    ).toHaveClass("bottom-2", "right-2");

    fireEvent.click(
      screen.getByRole("button", {
        name: "测试作者更新了作品：作品更新标题",
      }),
    );

    expect(mocks.openPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_id: "987654321098765432",
        tags: ["奇幻"],
      }),
    );
  });

  it("动态条目的作者入口不会打开作品预览", async () => {
    render(<ActivityPage />);

    await screen.findByText("作品更新标题");

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "前往 测试作者 的作者页",
      })[0],
    );

    expect(mocks.openPreview).not.toHaveBeenCalled();
  });

  it("已读通知不再显示 NEW，即使作品 viewer_flags 仍有 unread", async () => {
    mocks.useNotificationsList.mockReturnValue({
      data: {
        pages: [
          {
            results: [
              { ...notification, read_at: "2026-08-28T10:00:00Z" },
            ],
            total: 1,
            unread_count: 0,
            limit: 20,
            offset: 0,
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityPage />);

    await screen.findByText("作品更新标题");
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("点击顶部作者时在当前动态页筛选", async () => {
    render(<ActivityPage />);

    await screen.findByText("作品更新标题");

    fireEvent.click(
      screen.getByRole("button", { name: "测试作者" }),
    );

    expect(mocks.useNotificationsList).toHaveBeenLastCalledWith(
      {
        unreadOnly: false,
        authorId: "123456789012345678",
      },
      { enabled: true },
    );
    expect(
      screen.getByRole("button", { name: "测试作者" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen
        .getByRole("button", { name: "测试作者" })
        .querySelector("span span"),
    ).toHaveClass("border-(--od-accent)", "ring-2");
    expect(
      screen
        .getByRole("button", { name: "全部动态" })
        .querySelector("span span"),
    ).toHaveClass("border-transparent");
  });

  it("全部动态、系统通知与作者头像使用相同的对齐槽", async () => {
    render(<ActivityPage />);

    await screen.findByText("作品更新标题");

    expect(
      screen.getByRole("button", { name: "全部动态" }).firstElementChild,
    ).toHaveClass("h-14", "w-14");
    expect(
      screen
        .getByRole("button", { name: "全部动态" })
        .querySelector("span span"),
    ).toHaveClass("border-(--od-accent)", "ring-2");
    expect(
      screen.getByRole("button", { name: "测试作者" }).firstElementChild,
    ).toHaveClass("h-14", "w-14");
    expect(
      screen.getByRole("button", { name: "系统通知" }).firstElementChild,
    ).toHaveClass("h-14", "w-14");
  });

  it("系统通知作为固定来源筛选，并与作者筛选互斥", async () => {
    render(<ActivityPage />);
    await screen.findByText("作品更新标题");

    fireEvent.click(screen.getByRole("button", { name: "系统通知" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "系统通知" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(mocks.useNotificationsList).toHaveBeenLastCalledWith(
      { unreadOnly: false, authorId: undefined },
      { enabled: false },
    );
    expect(screen.queryByText("作品更新标题")).not.toBeInTheDocument();
    expect(screen.getByText("关注喜欢的作者与作品")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "测试作者" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "测试作者" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.queryByText("关注喜欢的作者与作品")).not.toBeInTheDocument();
  });

  it("全部动态按时间混排系统通知与后端动态", async () => {
    render(<ActivityPage />);

    const systemTitle = await screen.findByText("关注喜欢的作者与作品");
    const dynamicTitle = screen.getByText("作品更新标题");
    expect(
      systemTitle.compareDocumentPosition(dynamicTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("未读筛选分别使用静态本地时间和后端查询条件", async () => {
    window.localStorage.setItem(
      "od_notifications_last_opened_at",
      "2026-08-28T11:00:00Z",
    );
    render(<ActivityPage />);
    await screen.findByText("关注喜欢的作者与作品");

    fireEvent.click(screen.getByRole("button", { name: "未读" }));

    await waitFor(() =>
      expect(mocks.useNotificationsList).toHaveBeenLastCalledWith(
        { unreadOnly: true, authorId: undefined },
        { enabled: true },
      ),
    );
    expect(screen.queryByText("关注喜欢的作者与作品")).not.toBeInTheDocument();
    expect(screen.getByText("作品更新标题")).toBeInTheDocument();
  });

  it("点击系统通知打开强制公告并保存确认状态", async () => {
    render(<ActivityPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "查看系统通知：关注与动态功能现已上线",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "关注与动态功能现已上线" }),
    ).toHaveTextContent("需要确认");
    fireEvent.click(screen.getByRole("button", { name: "确认公告" }));

    expect(
      JSON.parse(
        window.localStorage.getItem("od_notifications_acknowledged") || "[]",
      ),
    ).toContain(staticNotification.id);
  });

  it("全部已读同时更新静态本地时间与后端动态", async () => {
    render(<ActivityPage />);
    await screen.findByText("关注喜欢的作者与作品");

    fireEvent.click(screen.getByRole("button", { name: "全部已读" }));

    await waitFor(() =>
      expect(mocks.markAllMutateAsync).toHaveBeenCalledTimes(1),
    );
    expect(
      window.localStorage.getItem("od_notifications_last_opened_at"),
    ).toBe(staticNotification.created_at);
  });
});
