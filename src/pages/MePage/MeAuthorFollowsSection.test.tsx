import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthorFollowItem } from "@/features/follows/api/authorFollowsApi";
import { MeAuthorFollowsSection } from "./MeAuthorFollowsSection";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
}));

vi.mock("@/features/follows/hooks/useAuthorFollow", () => ({
  useToggleAuthorFollow: () => ({
    isPending: false,
    mutate: mocks.mutate,
  }),
}));

vi.mock("@/shared/ui/LazyImage", () => ({
  LazyImage: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

function createItem(
  id: string,
  displayName: string,
  followedAt: string,
  active = true,
): AuthorFollowItem {
  return {
    author: {
      id,
      name: displayName.toLocaleLowerCase(),
      global_name: null,
      display_name: displayName,
      avatar_url: null,
    },
    followed_at: followedAt,
    active,
  };
}

const alice = createItem("1", "Alice", "2026-08-20T00:00:00Z");
const bob = createItem("2", "Bob", "2026-08-28T00:00:00Z", false);

describe("MeAuthorFollowsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("支持按名称排序、搜索和进入作者页", () => {
    const onOpenAuthor = vi.fn();
    render(
      <MeAuthorFollowsSection
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        items={[bob, alice]}
        status="all"
        total={2}
        onLoadMore={vi.fn()}
        onOpenAuthor={onOpenAuthor}
        onRefresh={vi.fn()}
        onSetStatus={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("作者关注排序"), {
      target: { value: "name-asc" },
    });
    expect(
      screen
        .getAllByRole("button", { name: /前往 .* 的作者页/ })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["前往 Alice 的作者页", "前往 Bob 的作者页"]);

    fireEvent.change(screen.getByLabelText("搜索已加载的关注作者"), {
      target: { value: "bob" },
    });
    expect(
      screen.queryByRole("button", { name: "前往 Alice 的作者页" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "前往 Bob 的作者页" }));
    expect(onOpenAuthor).toHaveBeenCalledWith("2");
  });

  it("当前和历史作者都能快速切换关注状态", () => {
    render(
      <MeAuthorFollowsSection
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        items={[alice, bob]}
        status="all"
        total={2}
        onLoadMore={vi.fn()}
        onOpenAuthor={vi.fn()}
        onRefresh={vi.fn()}
        onSetStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "取消关注" }));
    fireEvent.click(screen.getByRole("button", { name: "重新关注" }));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });
});
