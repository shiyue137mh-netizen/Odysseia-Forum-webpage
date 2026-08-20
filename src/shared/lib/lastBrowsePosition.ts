const LAST_BROWSE_POSITION_KEY = 'odysseia_last_browse_position_v1';
const LAST_BROWSE_POSITION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export interface LastBrowsePosition {
  url: string;
  scrollTop: number;
  savedAt: number;
}

export function shouldTrackBrowsePosition(pathname: string) {
  return ![
    '/',
    '/about',
    '/auth/callback',
    '/login',
    '/settings',
    '/test',
  ].includes(pathname) && !pathname.startsWith('/tournaments/manage/');
}

export function saveLastBrowsePosition(url: string, scrollTop: number) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (
      parsedUrl.origin !== window.location.origin ||
      !shouldTrackBrowsePosition(parsedUrl.pathname)
    ) {
      return;
    }

    // 净化 URL，确保持久化的基础 URL 不含瞬时 page 参数
    parsedUrl.searchParams.delete('page');

    const position: LastBrowsePosition = {
      url: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
      scrollTop: Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(
      LAST_BROWSE_POSITION_KEY,
      JSON.stringify(position),
    );
  } catch {
    // localStorage 或 URL 不可用时跳过记录，不影响正常导航。
  }
}

export function getLastBrowsePosition(): LastBrowsePosition | null {
  try {
    const raw = window.localStorage.getItem(LAST_BROWSE_POSITION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LastBrowsePosition>;
    if (
      typeof parsed.url !== 'string' ||
      typeof parsed.scrollTop !== 'number' ||
      !Number.isFinite(parsed.scrollTop) ||
      typeof parsed.savedAt !== 'number' ||
      !Number.isFinite(parsed.savedAt) ||
      Date.now() - parsed.savedAt > LAST_BROWSE_POSITION_MAX_AGE
    ) {
      window.localStorage.removeItem(LAST_BROWSE_POSITION_KEY);
      return null;
    }

    const parsedUrl = new URL(parsed.url, window.location.origin);
    if (
      parsedUrl.origin !== window.location.origin ||
      !shouldTrackBrowsePosition(parsedUrl.pathname)
    ) {
      window.localStorage.removeItem(LAST_BROWSE_POSITION_KEY);
      return null;
    }

    return {
      url: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
      scrollTop: Math.max(0, parsed.scrollTop),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}
