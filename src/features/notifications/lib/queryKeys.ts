import type { NotificationsQueryParams } from "@/features/notifications/api/notificationsApi";

export type NotificationListQueryParams = NotificationsQueryParams & {
  authorId?: string;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: NotificationListQueryParams = {}) =>
    [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};
