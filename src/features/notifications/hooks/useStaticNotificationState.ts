import { useCallback, useEffect, useState } from "react";

const LS_LAST_OPENED = "od_notifications_last_opened_at";
const LS_DISMISSED = "od_notifications_dismissed";
const LS_ACKNOWLEDGED = "od_notifications_acknowledged";
const STATIC_NOTIFICATION_STATE_EVENT = "od:static-notification-state-change";

function readLastOpenedAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LS_LAST_OPENED);
}

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // 本地存储不可用时不影响通知查看。
  }
}

function emitStateChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STATIC_NOTIFICATION_STATE_EVENT));
}

export function useStaticNotificationState() {
  const [lastOpenedAt, setLastOpenedAt] = useState(readLastOpenedAt);
  const [dismissedIds, setDismissedIds] = useState(() => readIds(LS_DISMISSED));
  const [acknowledgedIds, setAcknowledgedIds] = useState(() =>
    readIds(LS_ACKNOWLEDGED),
  );

  useEffect(() => {
    const sync = () => {
      setLastOpenedAt(readLastOpenedAt());
      setDismissedIds(readIds(LS_DISMISSED));
      setAcknowledgedIds(readIds(LS_ACKNOWLEDGED));
    };
    window.addEventListener(STATIC_NOTIFICATION_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STATIC_NOTIFICATION_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const markOpenedAt = useCallback((timestamp: string) => {
    if (typeof window === "undefined") return;
    const current = readLastOpenedAt();
    if (
      current &&
      new Date(current).getTime() >= new Date(timestamp).getTime()
    ) {
      return;
    }
    window.localStorage.setItem(LS_LAST_OPENED, timestamp);
    emitStateChange();
  }, []);

  const dismiss = useCallback((id: string) => {
    const ids = readIds(LS_DISMISSED);
    if (ids.includes(id)) return;
    writeIds(LS_DISMISSED, [...ids, id]);
    emitStateChange();
  }, []);

  const acknowledge = useCallback((id: string) => {
    const ids = readIds(LS_ACKNOWLEDGED);
    if (ids.includes(id)) return;
    writeIds(LS_ACKNOWLEDGED, [...ids, id]);
    emitStateChange();
  }, []);

  return {
    lastOpenedAt,
    dismissedIds,
    acknowledgedIds,
    markOpenedAt,
    dismiss,
    acknowledge,
  };
}
