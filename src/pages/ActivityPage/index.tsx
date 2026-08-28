import {
  Bell,
  CheckCheck,
  Loader2,
  Megaphone,
  Radio,
  RefreshCw,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthorFollowsList } from "@/features/follows/hooks/useAuthorFollow";
import type { DynamicNotification } from "@/features/notifications/api/notificationsApi";
import { DynamicNotificationCard } from "@/features/notifications/components/DynamicNotificationCard";
import { NotificationAnnouncementModal } from "@/features/notifications/components/NotificationAnnouncementModal";
import { SystemDynamicNotificationCard } from "@/features/notifications/components/SystemDynamicNotificationCard";
import {
  useMarkAllNotificationsRead,
  useNotificationUnreadCount,
  useNotificationsList,
} from "@/features/notifications/hooks/useNotificationsData";
import { useStaticNotificationState } from "@/features/notifications/hooks/useStaticNotificationState";
import { threadFromNotification } from "@/features/notifications/lib/threadFromNotification";
import {
  resolveStaticNotifications,
  type StaticNotificationDefinition,
} from "@/features/notifications/notificationsConfig";
import { notifyError, notifySuccess } from "@/features/mascot/lib/notify";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import { useInfiniteScrollTrigger } from "@/shared/hooks/useInfiniteScrollTrigger";
import { APP_VERSION } from "@/shared/config/appInfo";
import { extractErrorMessage } from "@/shared/lib/notify";

type ActivityFeedItem =
  | { kind: "system"; notification: StaticNotificationDefinition }
  | { kind: "dynamic"; notification: DynamicNotification };

function isStaticNotificationUnread(
  notification: StaticNotificationDefinition,
  lastOpenedAt: string | null,
) {
  return (
    !lastOpenedAt ||
    new Date(notification.created_at).getTime() >
      new Date(lastOpenedAt).getTime()
  );
}

export function ActivityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { openPreview } = usePreviewThread();
  const unreadOnly = searchParams.get("view") === "unread";
  const systemOnly = searchParams.get("source") === "system";
  const selectedAuthorId = !systemOnly && /^\d+$/.test(searchParams.get("author") ?? "")
    ? searchParams.get("author") ?? undefined
    : undefined;
  const [selectedStaticId, setSelectedStaticId] = useState<string | null>(null);
  const {
    lastOpenedAt,
    dismissedIds,
    acknowledgedIds,
    markOpenedAt,
    acknowledge,
  } = useStaticNotificationState();

  const authorsQuery = useAuthorFollowsList({ enabled: isAuthenticated });
  const notificationsQuery = useNotificationsList(
    { unreadOnly, authorId: selectedAuthorId },
    { enabled: isAuthenticated && !systemOnly },
  );
  const dynamicUnreadQuery = useNotificationUnreadCount({
    enabled: isAuthenticated,
  });
  const staticQuery = useQuery({
    queryKey: ["release-notifications", APP_VERSION],
    queryFn: () =>
      resolveStaticNotifications({ currentAppVersion: APP_VERSION }),
    staleTime: 5 * 60 * 1000,
  });
  const markAllRead = useMarkAllNotificationsRead();
  const loadMoreRef = useInfiniteScrollTrigger(notificationsQuery, {
    rootMargin: "320px",
  });

  const followedAuthors = useMemo(() => {
    const authors =
      authorsQuery.data?.pages.flatMap((page) => page.results) ?? [];
    return Array.from(
      new Map(
        authors
          .filter((item) => item.active)
          .map((item) => [String(item.author.id), item]),
      ).values(),
    );
  }, [authorsQuery.data?.pages]);

  const notifications = useMemo(
    () =>
      notificationsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [notificationsQuery.data?.pages],
  );
  const staticNotifications = useMemo(
    () =>
      (staticQuery.data ?? []).filter(
        (notification) => !dismissedIds.includes(notification.id),
      ),
    [dismissedIds, staticQuery.data],
  );
  const visibleStaticNotifications = useMemo(
    () =>
      unreadOnly
        ? staticNotifications.filter((notification) =>
            isStaticNotificationUnread(notification, lastOpenedAt),
          )
        : staticNotifications,
    [lastOpenedAt, staticNotifications, unreadOnly],
  );
  const staticUnreadCount = staticNotifications.filter((notification) =>
    isStaticNotificationUnread(notification, lastOpenedAt),
  ).length;
  const filteredDynamicUnreadCount =
    notificationsQuery.data?.pages[0]?.unread_count ?? 0;
  const globalDynamicUnreadCount =
    dynamicUnreadQuery.data?.unread_count ?? 0;
  const visibleUnreadCount = systemOnly
    ? staticUnreadCount
    : selectedAuthorId
      ? filteredDynamicUnreadCount
      : staticUnreadCount + filteredDynamicUnreadCount;
  const totalUnreadCount = staticUnreadCount + globalDynamicUnreadCount;
  const authorTotal = authorsQuery.data?.pages[0]?.total ?? followedAuthors.length;
  const sourceTotal = authorTotal + 1;
  const selectedStaticNotification =
    staticNotifications.find(
      (notification) => notification.id === selectedStaticId,
    ) ?? null;
  const feedItems = useMemo<ActivityFeedItem[]>(() => {
    const dynamicItems: ActivityFeedItem[] = systemOnly
      ? []
      : notifications.map((notification) => ({
          kind: "dynamic",
          notification,
        }));
    const systemItems: ActivityFeedItem[] = selectedAuthorId
      ? []
      : visibleStaticNotifications.map((notification) => ({
          kind: "system",
          notification,
        }));

    return [...dynamicItems, ...systemItems].sort(
      (left, right) =>
        new Date(right.notification.created_at).getTime() -
        new Date(left.notification.created_at).getTime(),
    );
  }, [notifications, selectedAuthorId, systemOnly, visibleStaticNotifications]);

  const setUnreadOnly = (nextUnreadOnly: boolean) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (nextUnreadOnly) next.set("view", "unread");
        else next.delete("view");
        return next;
      },
      { replace: true },
    );
  };

  const setSelectedSource = (source: "all" | "system" | string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("author");
        next.delete("source");
        if (source === "system") next.set("source", "system");
        else if (source !== "all") next.set("author", source);
        return next;
      },
      { replace: true },
    );
  };

  const handleMarkAllRead = async () => {
    if (markAllRead.isPending || totalUnreadCount === 0) return;
    const latestStatic = staticNotifications.reduce<string | null>(
      (latest, notification) =>
        !latest ||
        new Date(notification.created_at).getTime() > new Date(latest).getTime()
          ? notification.created_at
          : latest,
      null,
    );
    if (latestStatic) markOpenedAt(latestStatic);
    if (!isAuthenticated || globalDynamicUnreadCount === 0) {
      notifySuccess("当前通知已全部标记为已读");
      return;
    }
    try {
      const result = await markAllRead.mutateAsync();
      notifySuccess(
        result.marked_read > 0
          ? `已将 ${result.marked_read} 条动态及系统通知标记为已读`
          : "当前通知已全部标记为已读",
      );
    } catch (error) {
      notifyError(extractErrorMessage(error, "全部标记已读失败，请稍后再试"));
    }
  };

  const handleStaticOpen = (notification: StaticNotificationDefinition) => {
    markOpenedAt(notification.created_at);
    setSelectedStaticId(notification.id);
  };

  const handleAnnouncementClose = () => {
    if (!selectedStaticNotification) return;
    if (
      selectedStaticNotification.presentation === "required" &&
      !acknowledgedIds.includes(selectedStaticNotification.id)
    ) {
      acknowledge(selectedStaticNotification.id);
    }
    setSelectedStaticId(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:gap-10">
        <section className="od-page-heading flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="od-page-title">动态</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
              在这里查看系统通知、关注作品的更新，以及关注作者发布的新作品。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Link
              to="/me?tab=follows"
              className="od-inline-action od-inline-action-ghost"
            >
              <Settings2 className="h-3.5 w-3.5" />
              管理关注
            </Link>
            <button
              type="button"
              onClick={() => {
                void authorsQuery.refetch();
                if (!systemOnly) void notificationsQuery.refetch();
                void staticQuery.refetch();
              }}
              className="od-inline-action od-inline-action-ghost"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </button>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={totalUnreadCount === 0 || markAllRead.isPending}
              className="od-inline-action od-inline-action-soft disabled:pointer-events-none disabled:opacity-50"
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              全部已读
            </button>
          </div>
        </section>

        <section aria-labelledby="followed-authors-title">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-(--od-accent)" />
              <h2 id="followed-authors-title" className="od-text-title">
                动态来源
              </h2>
            </div>
            <span className="text-xs text-(--od-text-tertiary)">
              共 {sourceTotal} 个来源
            </span>
          </div>

          <div className="py-2">
            <div className="scrollbar-invisible flex items-start gap-5 overflow-x-auto px-1 pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedSource("all")}
                  className="group flex w-18 shrink-0 flex-col items-center gap-2 text-center"
                  aria-pressed={!selectedAuthorId && !systemOnly}
                >
                  <span className="flex h-14 w-14 items-center justify-center">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        !selectedAuthorId && !systemOnly
                          ? "border-(--od-accent) bg-(--od-surface-raised) text-(--od-text-primary) ring-2 ring-(--od-accent)/25"
                          : "border-transparent bg-(--od-surface-content) text-(--od-text-secondary) group-hover:bg-(--od-surface-raised) group-hover:text-(--od-text-primary)"
                      }`}
                    >
                      <Radio className="h-5 w-5" />
                    </span>
                  </span>
                  <span
                    className={`text-xs ${
                      !selectedAuthorId && !systemOnly
                        ? "font-medium text-(--od-text-primary)"
                        : "text-(--od-text-secondary)"
                    }`}
                  >
                    全部动态
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSource("system")}
                  className="group flex w-18 shrink-0 flex-col items-center gap-2 text-center"
                  aria-pressed={systemOnly}
                >
                  <span className="flex h-14 w-14 items-center justify-center">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        systemOnly
                          ? "border-(--od-accent) bg-(--od-surface-raised) text-(--od-text-primary) ring-2 ring-(--od-accent)/25"
                          : "border-transparent bg-(--od-surface-content) text-(--od-text-secondary) group-hover:bg-(--od-surface-raised) group-hover:text-(--od-text-primary)"
                      }`}
                    >
                      <Megaphone className="h-5 w-5" />
                    </span>
                  </span>
                  <span
                    className={`text-xs ${
                      systemOnly
                        ? "font-medium text-(--od-text-primary)"
                        : "text-(--od-text-secondary)"
                    }`}
                  >
                    系统通知
                  </span>
                </button>

                {!authorsQuery.isLoading && !authorsQuery.isError && followedAuthors.map((item) => {
                  const name =
                    item.author.display_name ||
                    item.author.global_name ||
                    item.author.name;
                  return (
                    <button
                      key={item.author.id}
                      type="button"
                      onClick={() => setSelectedSource(String(item.author.id))}
                      className={`group flex w-18 shrink-0 flex-col items-center gap-2 text-center ${
                        selectedAuthorId === String(item.author.id)
                          ? "text-(--od-accent)"
                          : ""
                      }`}
                      title={`只看 ${name} 的动态`}
                      aria-pressed={selectedAuthorId === String(item.author.id)}
                    >
                      <span className="flex h-14 w-14 items-center justify-center">
                        <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 transition-all group-hover:border-(--od-accent) ${
                          selectedAuthorId === String(item.author.id)
                            ? "border-(--od-accent) ring-2 ring-(--od-accent)/25"
                            : "border-transparent"
                        }`}>
                          <AuthorAvatar author={item.author} className="h-full w-full" />
                        </span>
                      </span>
                      <span className={`line-clamp-2 w-full text-xs leading-4 transition-colors group-hover:text-(--od-text-primary) ${
                        selectedAuthorId === String(item.author.id)
                          ? "font-medium text-(--od-accent)"
                          : "text-(--od-text-secondary)"
                      }`}>
                        {name}
                      </span>
                    </button>
                  );
                })}

                {authorsQuery.isLoading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex w-18 shrink-0 flex-col items-center gap-2"
                    >
                      <div className="h-12 w-12 animate-pulse rounded-full bg-(--od-surface-content)" />
                      <div className="h-3 w-14 animate-pulse rounded bg-(--od-surface-content)" />
                    </div>
                  ))}

                {!authorsQuery.isError && authorsQuery.hasNextPage && (
                  <button
                    type="button"
                    disabled={authorsQuery.isFetchingNextPage}
                    onClick={() => void authorsQuery.fetchNextPage()}
                    className="group flex w-18 shrink-0 flex-col items-center gap-2 text-center disabled:opacity-50"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-(--od-border-strong) text-(--od-text-tertiary) transition-colors group-hover:border-(--od-accent) group-hover:text-(--od-accent)">
                      {authorsQuery.isFetchingNextPage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-xs">更多</span>
                      )}
                    </span>
                    <span className="text-xs text-(--od-text-tertiary)">
                      加载更多
                    </span>
                  </button>
                )}
            </div>
            {authorsQuery.isError && (
              <p className="mt-2 px-1 text-xs text-(--od-text-tertiary)">
                作者关注列表暂时没有加载出来，系统通知仍可查看。
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="recent-activity-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-(--od-accent)" />
              <h2 id="recent-activity-title" className="od-text-title">
                最近更新
              </h2>
              {visibleUnreadCount > 0 && (
                <span className="rounded-full bg-(--od-accent)/10 px-2 py-0.5 text-[11px] font-medium text-(--od-accent)">
                  {visibleUnreadCount} 条未读
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: "全部", value: false },
                { label: "未读", value: true },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setUnreadOnly(option.value)}
                  className={`od-pill-chip ${
                    unreadOnly === option.value
                      ? "bg-(--od-accent)/10 text-(--od-accent)"
                      : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!systemOnly && staticQuery.isError && !notificationsQuery.isError && (
            <p className="mb-3 text-sm text-(--od-text-secondary)">
              系统通知暂时没有加载出来，关注动态仍可查看。
            </p>
          )}
          {!systemOnly && notificationsQuery.isError && !staticQuery.isError && (
            <p className="mb-3 text-sm text-(--od-text-secondary)">
              关注动态暂时没有加载出来，系统通知仍可查看。
            </p>
          )}

          {(systemOnly ? staticQuery.isLoading : notificationsQuery.isLoading || staticQuery.isLoading) ? (
            <div className="mx-auto flex max-w-4xl flex-col divide-y divide-(--od-border)">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-4 py-5">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-(--od-surface-content)" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-(--od-surface-content)" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-(--od-surface-content)" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-(--od-surface-content)" />
                  </div>
                  <div className="h-20 w-28 shrink-0 animate-pulse rounded-2xl bg-(--od-surface-content)" />
                </div>
              ))}
            </div>
          ) : (systemOnly ? staticQuery.isError : notificationsQuery.isError && staticQuery.isError) ? (
            <div className="py-12 text-center text-sm text-(--od-text-secondary)">
              动态暂时没有加载出来，稍后再试一次。
            </div>
          ) : feedItems.length === 0 ? (
            <div className="py-14 text-center">
              <Bell className="mx-auto h-7 w-7 text-(--od-border-strong)" />
              <p className="mt-3 text-base font-semibold text-(--od-text-primary)">
                {unreadOnly ? "没有未读动态" : "暂时没有动态"}
              </p>
              <p className="mt-1 text-sm text-(--od-text-secondary)">
                系统公告、关注作品更新或作者发布新作后，会出现在这里。
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col">
              {feedItems.map((item) =>
                item.kind === "system" ? (
                  <SystemDynamicNotificationCard
                    key={`system-${item.notification.id}`}
                    notification={item.notification}
                    unread={isStaticNotificationUnread(
                      item.notification,
                      lastOpenedAt,
                    )}
                    onOpen={() => handleStaticOpen(item.notification)}
                  />
                ) : (
                  <DynamicNotificationCard
                    key={`dynamic-${item.notification.id}`}
                    notification={item.notification}
                    onOpen={() =>
                      openPreview(
                        threadFromNotification(item.notification.thread),
                      )
                    }
                    onAuthorOpen={() => {
                      const authorId = item.notification.thread.author?.id;
                      if (authorId) navigate(`/u/${authorId}`);
                    }}
                  />
                ),
              )}
            </div>
          )}

          <div
            ref={systemOnly ? undefined : loadMoreRef}
            className="flex min-h-14 items-center justify-center"
          >
            {!systemOnly && notificationsQuery.isFetchingNextPage && (
              <Loader2 className="h-5 w-5 animate-spin text-(--od-accent)" />
            )}
            {!systemOnly && notificationsQuery.isFetchNextPageError && (
              <button
                type="button"
                onClick={() => void notificationsQuery.fetchNextPage()}
                className="od-inline-action od-inline-action-ghost"
              >
                继续加载失败，点击重试
              </button>
            )}
          </div>
        </section>
      </div>

      {selectedStaticNotification && (
        <NotificationAnnouncementModal
          key={selectedStaticNotification.id}
          notification={selectedStaticNotification}
          required={
            selectedStaticNotification.presentation === "required" &&
            !acknowledgedIds.includes(selectedStaticNotification.id)
          }
          onClose={handleAnnouncementClose}
        />
      )}
    </div>
  );
}
