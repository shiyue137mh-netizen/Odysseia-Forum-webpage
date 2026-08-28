import { act, fireEvent, render, screen } from "@/tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Author } from "@/entities/thread/types";
import { authorsApi } from "@/features/authors/api/authorsApi";
import {
  useAuthorFollowState,
  useToggleAuthorFollow,
} from "@/features/follows/hooks/useAuthorFollow";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { searchApi } from "@/features/search/api/searchApi";
import { AuthorWorksHoverCard } from "./AuthorWorksHoverCard";

vi.mock("@/features/search/api/searchApi", () => ({
  searchApi: { search: vi.fn() },
}));

vi.mock("@/features/authors/api/authorsApi", () => ({
  authorsApi: { getAuthorProfile: vi.fn() },
}));

vi.mock("@/features/preferences/hooks/useUserPreferences", () => ({
  useUserPreferences: vi.fn(() => ({
    user: null,
    preferences: null,
    savePreferences: vi.fn(),
    isSaving: false,
  })),
}));

vi.mock("@/features/follows/hooks/useAuthorFollow", () => ({
  useAuthorFollowState: vi.fn(() => ({
    data: false,
    isError: false,
    isLoading: false,
  })),
  useToggleAuthorFollow: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

const author: Author = {
  id: "123456789",
  name: "author_name",
  global_name: "作者名",
  display_name: "作者名",
  avatar_url: null,
};

describe("AuthorWorksHoverCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useUserPreferences).mockReturnValue({
      user: null,
      preferences: null,
      savePreferences: vi.fn(),
      isSaving: false,
    } as never);
    vi.mocked(useAuthorFollowState).mockReturnValue({
      data: false,
      isError: false,
      isLoading: false,
    } as never);
    vi.mocked(useToggleAuthorFollow).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(searchApi.search).mockReturnValue(new Promise(() => {}));
    vi.mocked(authorsApi.getAuthorProfile).mockReturnValue(
      new Promise(() => {}),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("停留达到阈值后才打开并查询作者作品", async () => {
    render(
      <AuthorWorksHoverCard author={author} currentThreadId="thread-1">
        <button type="button">作者头像</button>
      </AuthorWorksHoverCard>,
    );

    const trigger = screen.getByRole("button", {
      name: "作者头像",
    }).parentElement!;
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });

    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(searchApi.search).not.toHaveBeenCalled();
    expect(useUserPreferences).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(1));

    expect(
      screen.getByLabelText("作者名 的其他作品"),
    ).toBeInTheDocument();
    expect(searchApi.search).toHaveBeenCalledWith({
      include_authors: ["123456789"],
      exclude_thread_ids: ["thread-1"],
      apply_preferences: true,
      limit: 3,
      sort_method: "created_desc",
    });
    expect(useUserPreferences).toHaveBeenCalled();
    expect(authorsApi.getAuthorProfile).toHaveBeenCalledWith("123456789");
    expect(screen.getByLabelText("作者名 的其他作品")).toHaveClass("od-floating-glass");
  });

  it("鼠标从头像移入浮层时保持打开，离开两端后关闭", async () => {
    render(
      <AuthorWorksHoverCard author={author}>
        <button type="button">作者头像</button>
      </AuthorWorksHoverCard>,
    );

    const trigger = screen.getByRole("button", {
      name: "作者头像",
    }).parentElement!;
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await act(async () => vi.advanceTimersByTime(300));

    const panel = screen.getByRole("dialog", { hidden: true });
    fireEvent.pointerLeave(trigger);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerEnter(panel);
    act(() => vi.advanceTimersByTime(180));
    expect(panel).toBeInTheDocument();

    fireEvent.pointerLeave(panel);
    act(() => vi.advanceTimersByTime(180));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("屏蔽确认使用顶层 dialog，确认期间不会被 Hover 延迟关闭", async () => {
    vi.mocked(useUserPreferences).mockReturnValue({
      user: { id: "viewer-1" },
      preferences: { exclude_authors: [], include_authors: [], preferred_channels: [] },
      savePreferences: vi.fn(),
      isSaving: false,
    } as never);

    render(
      <AuthorWorksHoverCard author={author}>
        <button type="button">作者头像</button>
      </AuthorWorksHoverCard>,
    );

    const trigger = screen.getByRole("button", {
      name: "作者头像",
    }).parentElement!;
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await act(async () => vi.advanceTimersByTime(300));

    const panel = screen.getByLabelText("作者名 的其他作品");
    fireEvent.click(screen.getByRole("button", { name: "屏蔽作者" }));

    const confirmation = screen.getByRole("alertdialog");
    expect(confirmation.tagName).toBe("DIALOG");
    expect(confirmation.parentElement).toBe(document.body);

    fireEvent.pointerLeave(panel);
    act(() => vi.advanceTimersByTime(180));
    expect(confirmation).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(panel).toBeInTheDocument();
  });

  it("登录后可以从 Hover 中关注作者", async () => {
    const mutate = vi.fn();
    vi.mocked(useUserPreferences).mockReturnValue({
      user: { id: "viewer-1" },
      preferences: {
        exclude_authors: [],
        include_authors: [],
        preferred_channels: [],
      },
      savePreferences: vi.fn(),
      isSaving: false,
    } as never);
    vi.mocked(useToggleAuthorFollow).mockReturnValue({
      mutate,
      isPending: false,
    } as never);

    render(
      <AuthorWorksHoverCard author={author} initialFollowed={false}>
        <button type="button">作者头像</button>
      </AuthorWorksHoverCard>,
    );

    const trigger = screen.getByRole("button", {
      name: "作者头像",
    }).parentElement!;
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await act(async () => vi.advanceTimersByTime(300));

    fireEvent.click(screen.getByRole("button", { name: "关注作者" }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("关注状态加载失败时可以从 Hover 重试", async () => {
    const refetch = vi.fn();
    vi.mocked(useUserPreferences).mockReturnValue({
      user: { id: "viewer-1" },
      preferences: {
        exclude_authors: [],
        include_authors: [],
        preferred_channels: [],
      },
      savePreferences: vi.fn(),
      isSaving: false,
    } as never);
    vi.mocked(useAuthorFollowState).mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      isLoading: false,
      refetch,
    } as never);

    render(
      <AuthorWorksHoverCard author={author}>
        <button type="button">作者头像</button>
      </AuthorWorksHoverCard>,
    );

    const trigger = screen.getByRole("button", {
      name: "作者头像",
    }).parentElement!;
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    await act(async () => vi.advanceTimersByTime(300));

    fireEvent.click(screen.getByRole("button", { name: "重试关注状态" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
