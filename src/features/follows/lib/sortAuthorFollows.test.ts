import { describe, expect, it } from "vitest";

import type { AuthorFollowItem } from "@/features/follows/api/authorFollowsApi";
import { sortAuthorFollows } from "./sortAuthorFollows";

function createItem(
  id: string,
  displayName: string,
  followedAt: string,
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
    active: true,
  };
}

const alice = createItem("1", "Alice", "2026-08-20T00:00:00Z");
const bob = createItem("2", "Bob", "2026-08-28T00:00:00Z");

describe("sortAuthorFollows", () => {
  it("可以按最近或最早关注排序", () => {
    expect(sortAuthorFollows([alice, bob], "followed-newest")).toEqual([
      bob,
      alice,
    ]);
    expect(sortAuthorFollows([alice, bob], "followed-oldest")).toEqual([
      alice,
      bob,
    ]);
  });

  it("可以按作者名称正序或倒序排序", () => {
    expect(sortAuthorFollows([bob, alice], "name-asc")).toEqual([alice, bob]);
    expect(sortAuthorFollows([alice, bob], "name-desc")).toEqual([bob, alice]);
  });
});
