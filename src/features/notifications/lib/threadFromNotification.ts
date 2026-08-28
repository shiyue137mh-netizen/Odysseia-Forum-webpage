import type { Thread } from "@/entities/thread/types";
import type { DynamicNotification } from "@/features/notifications/api/notificationsApi";

export function threadFromNotification(
  thread: DynamicNotification["thread"],
): Thread {
  return {
    ...thread,
    tags: thread.tags ?? [],
    collection_count: thread.collection_count ?? 0,
    is_tournament: thread.is_tournament ?? false,
  };
}
