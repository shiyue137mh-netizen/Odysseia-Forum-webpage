import { describe, expect, it } from "vitest";

import type { FollowedThread } from "@/entities/thread/types";
import { sortFollowedThreads } from "@/features/follows/lib/sortFollows";

const followedThreads = [
  {
    thread_id: "1",
    created_at: "2026-01-01T00:00:00Z",
    followed_at: "2026-03-01T00:00:00Z",
    latest_update_at: "2026-04-01T00:00:00Z",
    has_update: false,
  },
  {
    thread_id: "2",
    created_at: "2026-02-01T00:00:00Z",
    followed_at: "2026-01-01T00:00:00Z",
    latest_update_at: "2026-03-01T00:00:00Z",
    has_update: true,
  },
] as FollowedThread[];

describe("sortFollowedThreads", () => {
  it("支持更新时间、关注时间和未读优先排序且不修改原数组", () => {
    expect(
      sortFollowedThreads(followedThreads, "updated").map(
        (item) => item.thread_id,
      ),
    ).toEqual(["1", "2"]);
    expect(
      sortFollowedThreads(followedThreads, "followed-oldest").map(
        (item) => item.thread_id,
      ),
    ).toEqual(["2", "1"]);
    expect(
      sortFollowedThreads(followedThreads, "unread").map(
        (item) => item.thread_id,
      ),
    ).toEqual(["2", "1"]);
    expect(followedThreads.map((item) => item.thread_id)).toEqual(["1", "2"]);
  });
});
