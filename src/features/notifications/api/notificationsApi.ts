import type { components } from "@shared-types/openapi";

import { apiClient } from "@/shared/api/client";

export type DynamicNotification =
  components["schemas"]["NotificationItem-Output"];
export type DynamicNotificationList = components["schemas"]["NotificationList"];
export type DynamicUnreadCount =
  components["schemas"]["UnreadCountResponse"];
export type MarkNotificationsReadResponse =
  components["schemas"]["MarkReadResponse"];

export interface NotificationsQueryParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export const notificationsApi = {
  list: async (
    params: NotificationsQueryParams = {},
    signal?: AbortSignal,
  ): Promise<DynamicNotificationList> => {
    const response = await apiClient.get<DynamicNotificationList>(
      "/notifications",
      {
        params: {
          limit: params.limit,
          offset: params.offset,
          unread_only: params.unreadOnly,
        },
        signal,
      },
    );
    return response.data;
  },

  getUnreadCount: async (
    signal?: AbortSignal,
  ): Promise<DynamicUnreadCount> => {
    const response = await apiClient.get<DynamicUnreadCount>(
      "/notifications/unread-count",
      { signal },
    );
    return response.data;
  },

  markThreadRead: async (
    threadId: string,
  ): Promise<MarkNotificationsReadResponse> => {
    const normalizedThreadId = String(threadId).trim();
    if (!/^\d+$/.test(normalizedThreadId)) throw new Error("无效作品 ID");
    const response = await apiClient.post<MarkNotificationsReadResponse>(
      `/notifications/threads/${normalizedThreadId}/read`,
    );
    return response.data;
  },

  markAllRead: async (): Promise<MarkNotificationsReadResponse> => {
    const response = await apiClient.post<MarkNotificationsReadResponse>(
      "/notifications/read-all",
    );
    return response.data;
  },
};
