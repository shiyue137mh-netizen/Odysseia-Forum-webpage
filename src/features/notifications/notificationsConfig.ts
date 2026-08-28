import { APP_VERSION, RELEASE_FEED_URL } from '@/shared/config/appInfo';
import { parse as parseYaml } from 'yaml';
import serverIconUrl from '@/assets/images/icon/forum-icon-256.png';

// ── 通知类型 ──────────────────────────────────────────
export type NotificationKind = 'release' | 'announcement' | 'maintenance';
export type NotificationPresentation = 'inbox' | 'popup' | 'required';

export interface StaticNotificationContent {
  title: string;
  message: string;
  tags: string[];
  virtual_tags: string[];
  thumbnail_urls: string[];
  author: {
    name: string;
    avatar_url: string | null;
  };
}

export interface StaticNotificationDefinition {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  created_at: string;
  starts_at: string;
  expires_at: string | null;
  version?: string;
  url?: string;
  presentation: NotificationPresentation;
  acknowledgement: string;
  content: StaticNotificationContent;
}

export interface ResolvedNotificationContext {
  currentAppVersion?: string;
}

// ── YAML Feed 原始类型 ──────────────────────────────────
interface ReleaseFeedItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  kind?: NotificationKind;
  /** @deprecated 兼容旧格式，映射到 kind */
  source?: 'webpage' | 'system';
  version?: string;
  url?: string;
  presentation?: NotificationPresentation;
  acknowledgement?: string;
  min_app_version?: string;
  starts_at?: string;
  expires_at?: string;
  preview_thread?: {
    title?: string;
    first_message_excerpt?: string;
    thumbnail_urls?: string[];
    tags?: string[];
    virtual_tags?: string[];
    author?: {
      name?: string;
      global_name?: string | null;
      display_name?: string;
      avatar_url?: string | null;
    };
  };
}

interface ReleaseFeedPayload {
  updates: ReleaseFeedItem[];
}

// ── 工具函数 ──────────────────────────────────────────

function compareSemver(a: string, b: string): number {
  const toNums = (v: string) =>
    v
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  const av = toNums(a);
  const bv = toNums(b);
  const max = Math.max(av.length, bv.length);
  for (let i = 0; i < max; i += 1) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

/** 将旧 `source` 字段映射到新 `kind` 体系 */
function resolveKind(item: ReleaseFeedItem): NotificationKind {
  if (item.kind) return item.kind;
  // 兼容旧格式
  if (item.source === 'system') return 'maintenance';
  if (item.version) return 'release';
  return 'announcement';
}

// ── 数据转换 ──────────────────────────────────────────

function toNotificationContent(item: ReleaseFeedItem): StaticNotificationContent {
  const preview = item.preview_thread;
  return {
    title: preview?.title ?? item.title,
    message: preview?.first_message_excerpt ?? item.message,
    tags: preview?.tags ?? [],
    virtual_tags: preview?.virtual_tags ?? [],
    thumbnail_urls: preview?.thumbnail_urls ?? [],
    author: {
      name: preview?.author?.display_name ?? preview?.author?.global_name ?? preview?.author?.name ?? 'Odysseia',
      avatar_url: preview?.author?.avatar_url ?? serverIconUrl,
    },
  };
}

function mapFeedItem(item: ReleaseFeedItem): StaticNotificationDefinition {
  const kind = resolveKind(item);
  return {
    id: item.id,
    kind,
    title: item.title,
    message: item.message,
    created_at: item.created_at,
    starts_at: item.starts_at ?? item.created_at,
    expires_at: item.expires_at ?? null,
    version: item.version,
    url: item.url,
    presentation:
      item.presentation === 'popup' || item.presentation === 'required'
        ? item.presentation
        : 'inbox',
    acknowledgement: typeof item.acknowledgement === 'string' && item.acknowledgement.trim()
      ? item.acknowledgement
      : '我已了解',
    content: toNotificationContent(item),
  };
}

// ── 过滤逻辑 ──────────────────────────────────────────

function isWithinTimeWindow(item: ReleaseFeedItem): boolean {
  const now = Date.now();
  const startsAt = item.starts_at ?? item.created_at;
  if (new Date(startsAt).getTime() > now) return false;
  if (item.expires_at && new Date(item.expires_at).getTime() < now) return false;
  return true;
}

function passesVersionGate(item: ReleaseFeedItem, currentVersion: string): boolean {
  if (!item.min_app_version) return true;
  return compareSemver(currentVersion, item.min_app_version) >= 0;
}

// ── 公开 API ──────────────────────────────────────────

export async function fetchReleaseNotifications(
  context?: ResolvedNotificationContext,
): Promise<StaticNotificationDefinition[]> {
  const currentVersion = context?.currentAppVersion ?? APP_VERSION;
  try {
    const response = await fetch(RELEASE_FEED_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/yaml, text/yaml, application/json, text/plain',
      },
    });
    if (!response.ok) {
      return [];
    }

    const raw = await response.text();
    const payload = parseYaml(raw) as ReleaseFeedPayload;
    const updates = Array.isArray(payload.updates) ? payload.updates : [];

    return updates
      .filter((item): item is ReleaseFeedItem => {
        if (!item || typeof item !== 'object') return false;
        return (
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.message === 'string' &&
          typeof item.created_at === 'string'
        );
      })
      .filter((item) => isWithinTimeWindow(item))
      .filter((item) => passesVersionGate(item, currentVersion))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(mapFeedItem);
  } catch {
    return [];
  }
}

/**
 * 根据上下文过滤静态通知。
 *
 * 当前实现比较简单：直接返回全部静态通知。
 * 未来可以根据用户偏好 / 是否首次访问等做更精细的控制。
 */
export async function resolveStaticNotifications(
  context?: ResolvedNotificationContext,
): Promise<StaticNotificationDefinition[]> {
  return fetchReleaseNotifications(context);
}
