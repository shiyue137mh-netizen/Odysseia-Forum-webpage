import {
  Activity,
  AlertCircle,
  Bell,
  CheckCheck,
  ChevronRight,
  Megaphone,
  Rocket,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { DynamicNotificationCard } from "@/features/notifications/components/DynamicNotificationCard";
import { NotificationAnnouncementModal } from "@/features/notifications/components/NotificationAnnouncementModal";
import {
  useMarkAllNotificationsRead,
  useNotificationPreview,
  useNotificationUnreadCount,
} from "@/features/notifications/hooks/useNotificationsData";
import { useStaticNotificationState } from "@/features/notifications/hooks/useStaticNotificationState";
import { threadFromNotification } from "@/features/notifications/lib/threadFromNotification";
import {
  resolveStaticNotifications,
  type NotificationKind,
  type StaticNotificationDefinition,
} from "@/features/notifications/notificationsConfig";
import { notifyError } from "@/features/mascot/lib/notify";
import { usePreviewStore } from "@/features/search/store/previewStore";
import { APP_VERSION } from "@/shared/config/appInfo";
import { useThemeSettings } from "@/shared/hooks/useSettings";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import { extractErrorMessage } from "@/shared/lib/notify";

const kindConfig: Record<
  NotificationKind,
  { label: string; icon: typeof Bell; color: string }
> = {
  release: { label: "版本更新", icon: Rocket, color: "text-sky-400" },
  announcement: {
    label: "社区公告",
    icon: Megaphone,
    color: "text-amber-400",
  },
  maintenance: { label: "系统维护", icon: Wrench, color: "text-orange-400" },
};

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationCenter({
  open,
  onClose,
  onUnreadChange,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const { backgroundImageEnabled } = useThemeSettings();
  const setPreviewThread = usePreviewStore((state) => state.setPreviewThread);
  const { isAuthenticated } = useAuth();
  const markAllRead = useMarkAllNotificationsRead();
  const {
    lastOpenedAt,
    dismissedIds,
    acknowledgedIds,
    markOpenedAt,
    dismiss,
    acknowledge,
  } = useStaticNotificationState();

  const [selectedStaticId, setSelectedStaticId] = useState<string | null>(null);

  const dynamicPreviewQuery = useNotificationPreview({
    enabled: open && isAuthenticated,
  });
  const dynamicUnreadQuery = useNotificationUnreadCount({
    enabled: isAuthenticated,
  });
  const staticQuery = useQuery({
    queryKey: ["release-notifications", APP_VERSION],
    queryFn: () =>
      resolveStaticNotifications({ currentAppVersion: APP_VERSION }),
    staleTime: 5 * 60 * 1000,
  });

  const staticDefinitions = useMemo(
    () => staticQuery.data ?? [],
    [staticQuery.data],
  );
  const staticNotifications = useMemo(
    () =>
      staticDefinitions.filter(
        (notification) => !dismissedIds.includes(notification.id),
      ),
    [dismissedIds, staticDefinitions],
  );
  const dynamicNotifications = dynamicPreviewQuery.data?.results ?? [];
  const dynamicUnreadCount = dynamicUnreadQuery.data?.unread_count ?? 0;

  const pendingRequiredNotification = useMemo(
    () =>
      [...staticDefinitions]
        .filter(
          (notification) =>
            notification.presentation === "required" &&
            !acknowledgedIds.includes(notification.id),
        )
        .sort(
          (left, right) =>
            new Date(left.created_at).getTime() -
            new Date(right.created_at).getTime(),
        )[0] ?? null,
    [acknowledgedIds, staticDefinitions],
  );
  const selectedStaticNotification =
    staticDefinitions.find(
      (notification) => notification.id === selectedStaticId,
    ) ?? null;
  const activeStaticNotification =
    pendingRequiredNotification ?? selectedStaticNotification;
  const activeRequiresAcknowledgement =
    pendingRequiredNotification?.id === activeStaticNotification?.id;

  const isStaticUnread = useCallback(
    (notification: StaticNotificationDefinition) =>
      !lastOpenedAt ||
      new Date(notification.created_at).getTime() >
        new Date(lastOpenedAt).getTime(),
    [lastOpenedAt],
  );
  const unreadStaticCount = useMemo(
    () => staticNotifications.filter(isStaticUnread).length,
    [isStaticUnread, staticNotifications],
  );
  const totalUnreadCount = unreadStaticCount + dynamicUnreadCount;

  useEffect(() => {
    onUnreadChange?.(totalUnreadCount);
  }, [onUnreadChange, totalUnreadCount]);

  useEffect(() => {
    if (!open || staticNotifications.length === 0) return;
    const latest = staticNotifications.reduce(
      (current, notification) =>
        !current ||
        new Date(notification.created_at).getTime() >
          new Date(current).getTime()
          ? notification.created_at
          : current,
      lastOpenedAt ?? "",
    );
    if (!latest || latest === lastOpenedAt) return;
    markOpenedAt(latest);
  }, [lastOpenedAt, markOpenedAt, open, staticNotifications]);

  const handleAnnouncementClose = () => {
    if (!activeStaticNotification) return;
    if (activeRequiresAcknowledgement) {
      acknowledge(activeStaticNotification.id);
    }
    setSelectedStaticId(null);
  };

  const handleMarkAllRead = async () => {
    if (markAllRead.isPending) return;
    const latest = staticNotifications.reduce(
      (current, notification) =>
        !current ||
        new Date(notification.created_at).getTime() >
          new Date(current).getTime()
          ? notification.created_at
          : current,
      lastOpenedAt ?? "",
    );
    if (latest) {
      markOpenedAt(latest);
    }
    if (!isAuthenticated || dynamicUnreadCount === 0) return;
    try {
      await markAllRead.mutateAsync();
    } catch (error) {
      notifyError(extractErrorMessage(error, "全部标记已读失败，请稍后再试"));
    }
  };

  if (!open && !activeStaticNotification) return null;

  const panelClass =
    (backgroundImageEnabled
      ? "od-floating-glass"
      : "od-floating-panel-solid") +
    " fixed inset-x-3 top-20 z-50 mx-auto flex max-h-[72vh] w-auto max-w-md flex-col items-stretch rounded-xl border border-(--od-border-strong) shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:max-h-[640px] sm:w-[390px]";

  return (
    <>
      {open && (
        <div role="dialog" aria-label="通知与动态" className={panelClass}>
          <header className="flex items-start justify-between border-b border-(--od-border-strong) px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-(--od-accent)" />
                <h2 className="text-sm font-semibold text-(--od-text-primary)">
                  通知与动态
                </h2>
              </div>
              <p className="mt-1 text-xs text-(--od-text-secondary)">
                悬浮查看摘要，点击通知按钮进入完整动态页。
              </p>
            </div>
            <div className="flex items-center gap-1">
              {totalUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={markAllRead.isPending}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary) disabled:opacity-50"
                  title="全部标记已读"
                  aria-label="全部标记已读"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
                aria-label="关闭通知"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
            {staticQuery.isError && (
              <InlineError message="系统公告加载失败，动态仍可查看。" />
            )}

            {!staticQuery.isError && staticNotifications.length > 0 && (
              <section aria-labelledby="system-notifications-title">
                <SectionHeading
                  id="system-notifications-title"
                  label="系统通知"
                  unreadCount={unreadStaticCount}
                />
                <div className="space-y-2">
                  {staticNotifications.map((notification) => (
                    <SystemNotificationRow
                      key={notification.id}
                      notification={notification}
                      unread={isStaticUnread(notification)}
                      acknowledged={acknowledgedIds.includes(notification.id)}
                      onOpen={() => setSelectedStaticId(notification.id)}
                      onDismiss={(event) => {
                        event.stopPropagation();
                        dismiss(notification.id);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="recent-dynamics-title">
              <SectionHeading
                id="recent-dynamics-title"
                label="最近动态"
                unreadCount={dynamicUnreadCount}
              />
              {dynamicPreviewQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-xl bg-(--od-surface-content)"
                    />
                  ))}
                </div>
              ) : dynamicPreviewQuery.isError ? (
                <InlineError message="最近动态加载失败，系统公告仍可查看。" />
              ) : dynamicNotifications.length > 0 ? (
                <div className="space-y-2">
                  {dynamicNotifications.map((notification) => (
                    <DynamicNotificationCard
                      key={notification.id}
                      notification={notification}
                      variant="compact"
                      onAuthorOpen={() => {
                        const authorId = notification.thread.author?.id;
                        if (authorId) navigate(`/u/${authorId}`);
                        onClose();
                      }}
                      onOpen={() => {
                        setPreviewThread(
                          threadFromNotification(notification.thread),
                        );
                        onClose();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-(--od-border) px-3 py-6 text-center text-xs text-(--od-text-secondary)">
                  暂时没有作品或作者动态。
                </p>
              )}
            </section>
          </div>

          <footer className="border-t border-(--od-border-strong) p-2">
            <button
              type="button"
              onClick={() => {
                navigate("/activity");
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-(--od-accent) transition-colors hover:bg-(--od-interactive-hover)"
            >
              <Activity className="h-4 w-4" />
              查看全部动态
              <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        </div>
      )}

      {activeStaticNotification && (
        <NotificationAnnouncementModal
          key={activeStaticNotification.id}
          notification={activeStaticNotification}
          required={activeRequiresAcknowledgement}
          onClose={handleAnnouncementClose}
        />
      )}
    </>
  );
}

function SectionHeading({
  id,
  label,
  unreadCount,
}: {
  id: string;
  label: string;
  unreadCount: number;
}) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h3
        id={id}
        className="text-[11px] font-semibold uppercase tracking-wider text-(--od-text-tertiary)"
      >
        {label}
      </h3>
      {unreadCount > 0 && (
        <span className="text-[10px] text-(--od-accent)">
          {unreadCount} 条未读
        </span>
      )}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-(--od-error)/30 px-3 py-2 text-xs text-(--od-error)">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function SystemNotificationRow({
  notification,
  unread,
  acknowledged,
  onOpen,
  onDismiss,
}: {
  notification: StaticNotificationDefinition;
  unread: boolean;
  acknowledged: boolean;
  onOpen: () => void;
  onDismiss: (event: React.MouseEvent) => void;
}) {
  const config = kindConfig[notification.kind];
  const KindIcon = config.icon;
  const canDismiss =
    notification.presentation !== "required" || acknowledged;
  const rowClass =
    "relative cursor-pointer rounded-xl border p-3 text-xs transition-colors hover:border-(--od-accent) hover:bg-(--od-interactive-hover) " +
    (unread
      ? "border-l-2 border-l-(--od-accent) border-y-(--od-border) border-r-(--od-border) bg-(--od-surface-card)"
      : "border-(--od-border) bg-(--od-surface-card)");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
      }}
      className={rowClass}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KindIcon className={"h-3.5 w-3.5 " + config.color} />
            <p className="line-clamp-1 font-semibold text-(--od-text-primary)">
              {notification.title}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 leading-5 text-(--od-text-secondary)">
            {notification.message}
          </p>
          <p className="mt-1 text-[10px] text-(--od-text-tertiary)">
            {config.label} · {formatRelativeDateTime(notification.created_at)}
          </p>
        </div>
        {canDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-(--od-text-tertiary) hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
            aria-label="关闭该通知"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
