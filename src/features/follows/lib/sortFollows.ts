import type { FollowedThread } from "@/entities/thread/types";
import { hasViewerFlag } from "@/entities/thread/lib/viewerFlags";

export type FollowSort =
  | "updated"
  | "followed-newest"
  | "followed-oldest"
  | "created"
  | "unread";

function timestamp(value?: string | null) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestActivity(thread: FollowedThread) {
  return timestamp(
    thread.latest_update?.published_at ||
      thread.latest_update_at ||
      thread.last_active_at ||
      thread.created_at,
  );
}

export function sortFollowedThreads(
  threads: FollowedThread[],
  sort: FollowSort,
) {
  return [...threads].sort((left, right) => {
    if (
      sort === "unread" &&
      hasViewerFlag(left, "unread") !== hasViewerFlag(right, "unread")
    ) {
      return hasViewerFlag(left, "unread") ? -1 : 1;
    }

    let difference = 0;
    if (sort === "followed-newest") {
      difference = timestamp(right.followed_at) - timestamp(left.followed_at);
    } else if (sort === "followed-oldest") {
      difference = timestamp(left.followed_at) - timestamp(right.followed_at);
    } else if (sort === "created") {
      difference = timestamp(right.created_at) - timestamp(left.created_at);
    } else {
      difference = latestActivity(right) - latestActivity(left);
    }

    return (
      difference ||
      String(right.thread_id).localeCompare(String(left.thread_id))
    );
  });
}
