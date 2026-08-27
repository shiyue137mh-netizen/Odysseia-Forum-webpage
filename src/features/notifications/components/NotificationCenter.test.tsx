import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Thread } from "@/entities/thread/types";
import { render } from "@/tests/test-utils";
import { NotificationCenter } from "./NotificationCenter";

const mocks = vi.hoisted(() => ({
  useFollowsFeed: vi.fn(),
  formatRelativeDateTime: vi.fn((value: string) => value),
}));
const mockedUseFollowsFeed = mocks.useFollowsFeed;
const mockedFormatRelativeDateTime = mocks.formatRelativeDateTime;

vi.mock("@/features/follows/hooks/useFollowsData", () => ({
  useFollowsFeed: mocks.useFollowsFeed,
  useMarkAllFollowsViewed: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/shared/hooks/useSettings", () => ({
  useThemeSettings: () => ({ backgroundImageEnabled: false }),
}));
vi.mock("@/shared/lib/dateTime", () => ({
  formatRelativeDateTime: mocks.formatRelativeDateTime,
}));
vi.mock("@/features/notifications/notificationsConfig", () => ({
  resolveStaticNotifications: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/shared/config/appInfo", () => ({ APP_VERSION: "test" }));
vi.mock("@/features/search/store/previewStore", () => ({
  usePreviewStore: (selector: (state: { setPreviewThread: () => void }) => unknown) =>
    selector({ setPreviewThread: vi.fn() }),
}));
vi.mock("@/shared/ui/LazyImage", () => ({
  LazyImage: () => null,
}));
vi.mock("@/features/notifications/components/NotificationAnnouncementModal", () => ({
  NotificationAnnouncementModal: () => null,
}));

const baseThread = {
  thread_id: "1",
  channel_id: "channel",
  title: "有新更新的帖子",
  created_at: "2026-08-01T00:00:00Z",
  reaction_count: 0,
  reply_count: 1,
  collection_count: 0,
  display_count: 0,
  first_message_excerpt: "更新内容",
  thumbnail_urls: [],
  tags: [],
  collected_flag: false,
  is_tournament: false,
  has_update: true,
  latest_update_at: "2026-08-27T10:00:00Z",
  last_active_at: "2026-08-27T11:00:00Z",
} as Thread;

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseFollowsFeed.mockReturnValue({
      data: { results: [baseThread], unread_count: 1 },
      isLoading: false,
      isError: false,
    });
  });

  it("使用 latest_update_at 展示并记录 dismiss，普通活跃变化不会重现", async () => {
    const { rerender } = render(
      <NotificationCenter open onClose={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByText("有新更新的帖子")).toBeInTheDocument(),
    );
    expect(mockedFormatRelativeDateTime).toHaveBeenCalledWith(
      "2026-08-27T10:00:00Z",
    );

    fireEvent.click(screen.getByRole("button", { name: /有新更新的帖子/ }));
    expect(screen.queryByText("有新更新的帖子")).not.toBeInTheDocument();

    mockedUseFollowsFeed.mockReturnValue({
      data: {
        results: [
          {
            ...baseThread,
            last_active_at: "2026-08-27T12:00:00Z",
          },
        ],
        unread_count: 1,
      },
      isLoading: false,
      isError: false,
    });
    rerender(<NotificationCenter open onClose={vi.fn()} />);
    expect(screen.queryByText("有新更新的帖子")).not.toBeInTheDocument();

    mockedUseFollowsFeed.mockReturnValue({
      data: {
        results: [
          {
            ...baseThread,
            latest_update_at: "2026-08-27T13:00:00Z",
            last_active_at: "2026-08-27T13:00:00Z",
          },
        ],
        unread_count: 1,
      },
      isLoading: false,
      isError: false,
    });
    rerender(<NotificationCenter open onClose={vi.fn()} />);
    expect(screen.getByText("有新更新的帖子")).toBeInTheDocument();
  });
});
