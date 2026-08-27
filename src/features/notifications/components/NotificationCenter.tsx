import { Bell, X, AlertCircle, Trash2, Megaphone, Wrench, Rocket } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useFollowsFeed, useMarkAllFollowsViewed } from '@/features/follows/hooks/useFollowsData';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Thread } from '@/entities/thread/types';
import { APP_VERSION } from '@/shared/config/appInfo';
import {
  resolveStaticNotifications,
  type NotificationKind,
  type StaticNotificationDefinition,
} from '@/features/notifications/notificationsConfig';
import { usePreviewStore } from '@/features/search/store/previewStore';
import { useThemeSettings } from '@/shared/hooks/useSettings';
import { formatRelativeDateTime } from '@/shared/lib/dateTime';
import { notifyError } from '@/features/mascot/lib/notify';
import { extractErrorMessage } from '@/shared/lib/notify';
import { LazyImage } from '@/shared/ui/LazyImage';
import { NotificationAnnouncementModal } from '@/features/notifications/components/NotificationAnnouncementModal';

// ── LocalStorage 工具 ──────────────────────────────────

const LS_LAST_OPENED = 'od_notifications_last_opened_at';
const LS_DISMISSED = 'od_notifications_dismissed';
const LS_ACKNOWLEDGED = 'od_notifications_acknowledged';

function getLastOpenedAt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LS_LAST_OPENED);
}

function setLastOpenedAt(timestamp: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_LAST_OPENED, timestamp);
}

function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_DISMISSED);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function setDismissedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_DISMISSED, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function getAcknowledgedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_ACKNOWLEDGED);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function setAcknowledgedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_ACKNOWLEDGED, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// ── Kind 标签配置 ──────────────────────────────────────

const kindConfig: Record<NotificationKind, { label: string; icon: typeof Bell; color: string }> = {
  release: { label: '版本更新', icon: Rocket, color: 'text-sky-400' },
  announcement: { label: '社区公告', icon: Megaphone, color: 'text-amber-400' },
  maintenance: { label: '系统维护', icon: Wrench, color: 'text-orange-400' },
};

// ── 类型 ──────────────────────────────────────────────

type CombinedNotificationKind = NotificationKind | 'follow_update';

interface NotificationItem {
  id: string;
  kind: CombinedNotificationKind;
  title: string;
  message: string;
  created_at?: string;
  thread?: Thread;
  staticNotification?: StaticNotificationDefinition;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

// ── 组件 ──────────────────────────────────────────────

export function NotificationCenter({ open, onClose, onUnreadChange }: NotificationCenterProps) {
  const navigate = useNavigate();
  const { backgroundImageEnabled } = useThemeSettings();
  const setPreviewThread = usePreviewStore((state) => state.setPreviewThread);
  const { isAuthenticated } = useAuth();
  const markAllViewed = useMarkAllFollowsViewed();

  // 已读时间戳
  const [lastOpenedAt, setLastOpenedAtState] = useState<string | null>(() => getLastOpenedAt());

  // 手动 dismiss 的 ID 列表（永久隐藏）
  const [dismissedIds, setDismissedIdsState] = useState<string[]>(() => getDismissedIds());
  const [acknowledgedIds, setAcknowledgedIdsState] = useState<string[]>(() => getAcknowledgedIds());
  const [selectedStaticId, setSelectedStaticId] = useState<string | null>(null);

  // 关注帖子更新的 dismiss 记录
  const [dismissedFollowUpdates, setDismissedFollowUpdates] = useState<Record<string, string>>({});

  // 同步 dismiss 到 localStorage
  useEffect(() => {
    setDismissedIds(dismissedIds);
  }, [dismissedIds]);

  useEffect(() => {
    setAcknowledgedIds(acknowledgedIds);
  }, [acknowledgedIds]);

  // ── 数据拉取 ──

  // 本组件由 TopBar 常驻挂载，而 `if (!open) return null` 在 hook 之后，
  // 所以此前不论面板是否展开、用户是否登录，全站每 30 秒都会打一次 /follows/。
  // 走 feature 自己的 hook：未登录完全不拉；完整列表只在面板展开时拉，未读数常驻（红点依赖它）。
  const { data, isLoading, isError, refetch: refetchFollows } = useFollowsFeed(
    {},
    { enabled: isAuthenticated, listEnabled: open },
  );

  const {
    data: staticDefs = [],
    isLoading: isStaticLoading,
    isError: isStaticError,
  } = useQuery({
    queryKey: ['release-notifications', APP_VERSION],
    queryFn: () => resolveStaticNotifications({ currentAppVersion: APP_VERSION }),
    staleTime: 5 * 60 * 1000,
  });

  const follows = data?.results ?? [];
  const unreadCount = data?.unread_count ?? 0;

  // ── 通知列表组装 ──

  const staticNotifications: NotificationItem[] = useMemo(() =>
    staticDefs
      .filter((def) => !dismissedIds.includes(def.id))
      .map((def) => ({
        id: def.id,
        kind: def.kind,
        title: def.title,
        message: def.message,
        created_at: def.created_at,
        staticNotification: def,
      })),
    [staticDefs, dismissedIds],
  );

  const followNotifications: NotificationItem[] = useMemo(() =>
    follows
      .filter((thread) => thread.has_update)
      .filter((thread) => {
        const id = `follow-${thread.thread_id}`;
        const currentUpdateStamp = thread.latest_update_at ?? thread.last_active_at ?? thread.created_at;
        const dismissedStamp = dismissedFollowUpdates[id];
        return dismissedStamp !== currentUpdateStamp;
      })
      .map((thread) => ({
        id: `follow-${thread.thread_id}`,
        kind: 'follow_update' as const,
        title: thread.title,
        message: thread.first_message_excerpt ?? '该帖子有新的更新。',
        created_at: thread.latest_update_at ?? thread.last_active_at ?? undefined,
        thread,
      })),
    [follows, dismissedFollowUpdates],
  );

  const allNotifications: NotificationItem[] = useMemo(
    () => [...staticNotifications, ...followNotifications],
    [staticNotifications, followNotifications],
  );

  const pendingRequiredNotification = useMemo(
    () => [...staticDefs]
      .filter((def) => def.presentation === 'required' && !acknowledgedIds.includes(def.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] ?? null,
    [acknowledgedIds, staticDefs],
  );
  const selectedStaticNotification = useMemo(
    () => staticDefs.find((def) => def.id === selectedStaticId) ?? null,
    [selectedStaticId, staticDefs],
  );
  const activeStaticNotification = pendingRequiredNotification ?? selectedStaticNotification;
  const activeRequiresAcknowledgement = pendingRequiredNotification?.id === activeStaticNotification?.id;

  // ── 未读计算 ──

  const isUnread = useCallback(
    (item: NotificationItem): boolean => {
      if (!lastOpenedAt || !item.created_at) return true;
      return new Date(item.created_at).getTime() > new Date(lastOpenedAt).getTime();
    },
    [lastOpenedAt],
  );

  const unreadStaticCount = useMemo(
    () => staticNotifications.filter(isUnread).length,
    [staticNotifications, isUnread],
  );

  const totalUnreadCount = unreadStaticCount + followNotifications.length;

  useEffect(() => {
    onUnreadChange?.(totalUnreadCount);
  }, [totalUnreadCount, onUnreadChange]);

  // ── 打开面板时标记已读 ──

  useEffect(() => {
    if (!open) return;
    if (staticNotifications.length === 0) return;
    // 找到最新的 created_at
    const latestCreatedAt = staticNotifications.reduce((latest, item) => {
      if (!item.created_at) return latest;
      return !latest || new Date(item.created_at).getTime() > new Date(latest).getTime()
        ? item.created_at
        : latest;
    }, lastOpenedAt ?? '');

    if (latestCreatedAt && latestCreatedAt !== lastOpenedAt) {
      setLastOpenedAt(latestCreatedAt);
      setLastOpenedAtState(latestCreatedAt);
    }
  }, [open, staticNotifications, lastOpenedAt]);

  // ── 事件处理 ──

  const handleNotificationClick = (item: NotificationItem) => {
    if (item.kind === 'follow_update' && item.thread) {
      const currentUpdateStamp = item.thread.latest_update_at ?? item.thread.last_active_at ?? item.thread.created_at;
      setDismissedFollowUpdates((prev) => ({
        ...prev,
        [item.id]: currentUpdateStamp,
      }));
      setPreviewThread(item.thread);
      return;
    }

    if (item.staticNotification) setSelectedStaticId(item.staticNotification.id);
  };

  const handleAnnouncementClose = () => {
    if (!activeStaticNotification) return;
    if (activeRequiresAcknowledgement) {
      setAcknowledgedIdsState((prev) => (
        prev.includes(activeStaticNotification.id) ? prev : [...prev, activeStaticNotification.id]
      ));
    }
    setSelectedStaticId(null);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIdsState((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleClearAllNotifications = async () => {
    if (markAllViewed.isPending) return;
    // 静态通知：更新 last_opened_at 即可标记全部已读
    const latestCreatedAt = staticNotifications.reduce((latest, item) => {
      if (!item.created_at) return latest;
      return !latest || new Date(item.created_at).getTime() > new Date(latest).getTime()
        ? item.created_at
        : latest;
    }, lastOpenedAt ?? '');

    if (latestCreatedAt) {
      setLastOpenedAt(latestCreatedAt);
      setLastOpenedAtState(latestCreatedAt);
    }

    // 关注帖子通知：标记已读
    const dismissedSnapshot = dismissedFollowUpdates;
    const nextDismissedFollowUpdates = { ...dismissedSnapshot };
    for (const thread of follows) {
      if (!thread.has_update) continue;
      const id = `follow-${thread.thread_id}`;
      nextDismissedFollowUpdates[id] = thread.latest_update_at ?? thread.last_active_at ?? thread.created_at;
    }
    setDismissedFollowUpdates(nextDismissedFollowUpdates);

    try {
      // useMarkAllFollowsViewed 内部会失效 followsKeys.all
      await markAllViewed.mutateAsync();
    } catch (error) {
      setDismissedFollowUpdates(dismissedSnapshot);
      void refetchFollows();
      notifyError(extractErrorMessage(error, '标记已读失败，请稍后再试'));
    }
  };

  if (!open && !activeStaticNotification) return null;

  const hasAnyNotification = allNotifications.length > 0;

  return (
    <>
    {open && <div
      role="dialog"
      aria-modal="true"
      aria-label="通知中心"
      className={`${backgroundImageEnabled ? 'od-floating-glass' : 'od-floating-panel-solid'} fixed inset-x-3 top-20 z-50 mx-auto flex max-h-[70vh] w-auto max-w-md flex-col items-stretch rounded-xl border border-(--od-border-strong) shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:max-h-[600px] sm:w-[360px]`}
    >
      <div className="flex items-start justify-between border-b border-(--od-border-strong) px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-(--od-accent)" />
            <h2 className="text-sm font-semibold text-(--od-text-primary)">通知中心</h2>
          </div>
          <p className="mt-1 text-xs text-(--od-text-secondary)">
            包含关注帖子更新与索引页/系统更新公告。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
          aria-label="关闭通知中心"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs text-(--od-text-secondary)">
        <span>当前共有 {unreadCount} 个关注更新</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearAllNotifications}
            disabled={markAllViewed.isPending}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-(--od-text-tertiary) hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary) disabled:cursor-wait disabled:opacity-50"
            title="全部标记已读"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { navigate('/me?tab=follows'); onClose(); }}
            className="text-(--od-accent) hover:underline"
          >
            前往「我的关注」
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1">
        {(isLoading || isStaticLoading) && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-16 animate-pulse rounded-lg bg-[color-mix(in_oklab,var(--od-bg-secondary)_80%,transparent)]"
              />
            ))}
          </div>
        )}

        {isError && isStaticError && !(isLoading || isStaticLoading) && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-(--od-text-secondary)">
            <AlertCircle className="h-5 w-5 text-(--od-error)" />
            <p>加载通知失败，请稍后重试。</p>
          </div>
        )}

        {!(isError && isStaticError) && isError && (
          <div className="mb-2 rounded-lg border border-(--od-error)/30 px-3 py-2 text-xs text-(--od-error)">
            关注更新加载失败，静态公告仍可查看。
          </div>
        )}

        {!(isError && isStaticError) && isStaticError && (
          <div className="mb-2 rounded-lg border border-(--od-error)/30 px-3 py-2 text-xs text-(--od-error)">
            系统公告加载失败，关注更新仍可查看。
          </div>
        )}

        {!isLoading && !isStaticLoading && !(isError && isStaticError) && !hasAnyNotification && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-(--od-text-secondary)">
            <Bell className="h-6 w-6 text-(--od-border-strong)" />
            <p>当前没有新的通知。</p>
            <p>可以在「我的关注」中管理帖子更新。</p>
          </div>
        )}

        {!(isError && isStaticError) && hasAnyNotification && (
          <div className="space-y-2">
            {allNotifications.map((item) => {
              const unread = isUnread(item);
              const kc = item.kind !== 'follow_update' ? kindConfig[item.kind] : null;
              const KindIcon = kc?.icon;
              const canDismiss = item.kind !== 'follow_update' && (
                item.staticNotification?.presentation !== 'required' || acknowledgedIds.includes(item.id)
              );

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    handleNotificationClick(item);
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group relative cursor-pointer rounded-lg border p-3 text-xs transition-colors hover:border-(--od-accent) hover:bg-[color-mix(in_oklab,var(--od-bg-secondary)_85%,transparent)] ${
                    unread
                      ? 'border-l-2 border-l-(--od-accent) border-t-(--od-border) border-r-(--od-border) border-b-(--od-border) bg-(--od-card)'
                      : 'border-(--od-border) bg-(--od-card)'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {unread && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--od-accent)" />
                      )}
                      <p className="line-clamp-1 font-semibold text-(--od-text-primary)">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {kc && KindIcon && (
                        <span className={`inline-flex items-center gap-1 rounded bg-(--od-bg-tertiary) px-1.5 py-0.5 text-[10px] ${kc.color}`}>
                          <KindIcon className="h-2.5 w-2.5" />
                          {kc.label}
                        </span>
                      )}
                      {item.kind === 'follow_update' && (
                        <span className="rounded bg-(--od-bg-tertiary) px-1.5 py-0.5 text-[10px] text-(--od-text-tertiary)">
                          关注更新
                        </span>
                      )}
                      {item.staticNotification?.presentation === 'required' && (
                        <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                          {acknowledgedIds.includes(item.id) ? '已确认' : '需确认'}
                        </span>
                      )}
                      {item.created_at && (
                        <span className="whitespace-nowrap text-[10px] text-(--od-text-tertiary)">
                          {formatRelativeDateTime(item.created_at)}
                        </span>
                      )}
                      {canDismiss && (
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(item.id, e)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-(--od-text-tertiary) hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
                          aria-label="关闭该通知"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {item.kind === 'follow_update' && item.thread && (
                    <div className="mb-2 flex items-start gap-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-(--od-bg-tertiary)">
                        {item.thread.thumbnail_urls && item.thread.thumbnail_urls.length > 0 ? (
                          <LazyImage
                            src={item.thread.thumbnail_urls[0]}
                            alt={item.title}
                            className="h-full w-full"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-(--od-text-tertiary)">
                            <Bell className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-(--od-text-tertiary)">
                          {item.thread.author?.display_name ??
                            item.thread.author?.global_name ??
                            item.thread.author?.name ??
                            '未知作者'}
                        </p>
                        <p className="line-clamp-2 text-[11px] text-(--od-text-secondary)">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {item.kind !== 'follow_update' && (
                    <p className="line-clamp-2 text-(--od-text-secondary)">{item.message}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>}
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
