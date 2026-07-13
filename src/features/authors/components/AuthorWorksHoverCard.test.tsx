import { act, fireEvent, render, screen } from "@/tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Author } from "@/entities/thread/types";
import { authorsApi } from "@/features/authors/api/authorsApi";
import { searchApi } from "@/features/search/api/searchApi";
import { AuthorWorksHoverCard } from "./AuthorWorksHoverCard";

vi.mock("@/features/search/api/searchApi", () => ({
  searchApi: { search: vi.fn() },
}));

vi.mock("@/features/authors/api/authorsApi", () => ({
  authorsApi: { getAuthorProfile: vi.fn() },
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

    await act(async () => vi.advanceTimersByTime(1));

    expect(
      screen.getByRole("dialog", { name: "作者名 的其他作品" }),
    ).toBeInTheDocument();
    expect(searchApi.search).toHaveBeenCalledWith({
      include_authors: ["123456789"],
      exclude_thread_ids: ["thread-1"],
      apply_preferences: true,
      limit: 3,
      sort_method: "created_desc",
    });
    expect(authorsApi.getAuthorProfile).toHaveBeenCalledWith("123456789");
    expect(screen.getByRole("dialog")).toHaveClass("od-floating-glass");
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

    const panel = screen.getByRole("dialog");
    fireEvent.pointerLeave(trigger);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerEnter(panel);
    act(() => vi.advanceTimersByTime(180));
    expect(panel).toBeInTheDocument();

    fireEvent.pointerLeave(panel);
    act(() => vi.advanceTimersByTime(180));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
