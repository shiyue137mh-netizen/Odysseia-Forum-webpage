import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/tests/test-utils";
import { NotificationCenter } from "./NotificationCenter";

const mocks = vi.hoisted(() => ({
  setPreviewThread: vi.fn(),
  useNotificationPreview: vi.fn(),
  useNotificationUnreadCount: vi.fn(),
  markAllMutateAsync: vi.fn(),
  resolveStaticNotifications: vi.fn(),
}));

vi.mock("@/features/notifications/hooks/useNotificationsData", () => ({
  useNotificationPreview: mocks.useNotificationPreview,
  useNotificationUnreadCount: mocks.useNotificationUnreadCount,
  useMarkAllNotificationsRead: () => ({
    isPending: false,
    mutateAsync: mocks.markAllMutateAsync,
  }),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/shared/hooks/useSettings", () => ({
  useThemeSettings: () => ({ backgroundImageEnabled: false }),
  useOpenModeSetting: () => "web",
}));
vi.mock("@/shared/lib/dateTime", () => ({
  formatRelativeDateTime: (value: string) => value,
}));
vi.mock("@/features/notifications/notificationsConfig", () => ({
  resolveStaticNotifications: mocks.resolveStaticNotifications,
}));
vi.mock("@/shared/config/appInfo", () => ({ APP_VERSION: "test" }));
vi.mock("@/features/search/store/previewStore", () => ({
  usePreviewStore: (
    selector: (state: { setPreviewThread: typeof mocks.setPreviewThread }) => unknown,
  ) => selector({ setPreviewThread: mocks.setPreviewThread }),
}));
vi.mock("@/shared/ui/LazyImage", () => ({
  LazyImage: () => null,
}));
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
    <div
      role="dialog"
      aria-label={`弹出通知：${notification.title}`}
      data-required={String(required)}
    >
      <button type="button" onClick={onClose}>
        关闭弹出通知
      </button>
    </div>
  ),
}));

const staticNotification = {
  id: "system-1",
  kind: "announcement",
  title: "系统公告",
  message: "公告正文",
  created_at: "2026-08-28T08:00:00Z",
  starts_at: "2026-08-28T08:00:00Z",
  expires_at: null,
  presentation: "inbox",
  acknowledgement: "我已了解",
  content: {
    title: "系统公告",
    message: "公告正文",
    tags: [],
    virtual_tags: [],
    thumbnail_urls: [],
    author: { name: "Odysseia", avatar_url: null },
  },
} as const;

const dynamicNotification = {
  id: 1,
  type: "thread_update",
  thread: {
    thread_id: "123456789012345678",
    channel_id: "channel",
    title: "作品更新标题",
    created_at: "2026-08-01T00:00:00Z",
    reaction_count: 0,
    reply_count: 0,
    collection_count: 0,
    display_count: 0,
    first_message_excerpt: "作品简介",
    thumbnail_urls: [],
    tags: [],
    collected_flag: false,
    is_tournament: false,
    author: {
      id: "author-1",
      name: "author",
      global_name: null,
      display_name: "测试作者",
      avatar_url: null,
    },
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

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.resolveStaticNotifications.mockResolvedValue([staticNotification]);
    mocks.useNotificationPreview.mockReturnValue({
      data: {
        results: [dynamicNotification],
        total: 1,
        unread_count: 1,
        limit: 5,
        offset: 0,
      },
      isLoading: false,
      isError: false,
    });
    mocks.useNotificationUnreadCount.mockReturnValue({
      data: { unread_count: 1 },
    });
  });

  it("同一弹层展示系统公告与最近动态", async () => {
    render(<NotificationCenter open onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("系统公告")).toBeInTheDocument());
    expect(screen.getByText("作品更新标题")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看全部动态" }),
    ).toBeInTheDocument();
  });

  it("点击动态条目打开作品预览", async () => {
    const onClose = vi.fn();
    render(<NotificationCenter open onClose={onClose} />);

    const item = await screen.findByRole("button", {
      name: "测试作者更新了作品：作品更新标题",
    });
    fireEvent.click(item);

    expect(mocks.setPreviewThread).toHaveBeenCalledWith(
      dynamicNotification.thread,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("popup 会自动弹出但不要求读到底，关闭后不会再次自动弹出", async () => {
    mocks.resolveStaticNotifications.mockResolvedValue([
      { ...staticNotification, presentation: "popup" },
    ]);

    const { unmount } = render(
      <NotificationCenter open={false} onClose={vi.fn()} />,
    );

    const modal = await screen.findByRole("dialog", {
      name: "弹出通知：系统公告",
    });
    expect(modal).toHaveAttribute("data-required", "false");

    fireEvent.click(screen.getByRole("button", { name: "关闭弹出通知" }));
    await waitFor(() => expect(modal).not.toBeInTheDocument());
    expect(window.localStorage.getItem("od_notifications_last_opened_at")).toBe(
      staticNotification.created_at,
    );

    unmount();
    render(<NotificationCenter open={false} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(mocks.resolveStaticNotifications).toHaveBeenCalled(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("inbox 不主动弹出，required 仍强制弹出", async () => {
    const { unmount } = render(
      <NotificationCenter open={false} onClose={vi.fn()} />,
    );
    await waitFor(() =>
      expect(mocks.resolveStaticNotifications).toHaveBeenCalled(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();

    mocks.resolveStaticNotifications.mockResolvedValue([
      { ...staticNotification, presentation: "required" },
    ]);
    render(<NotificationCenter open={false} onClose={vi.fn()} />);

    expect(
      await screen.findByRole("dialog", { name: "弹出通知：系统公告" }),
    ).toHaveAttribute("data-required", "true");
  });
});
