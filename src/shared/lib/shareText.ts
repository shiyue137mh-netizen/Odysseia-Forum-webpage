interface BooklistShareSource {
  id: number | string;
  title: string;
  description?: string | null;
  item_count: number;
  collection_count: number;
  view_count: number;
  is_public: boolean;
}

interface AuthorShareSource {
  userId: string;
  authorName: string;
  stats: {
    thread_count: number;
    reaction_count: number;
    reply_count: number;
  };
}

export function buildAbsoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window === 'undefined') return normalizedPath;
  return `${window.location.origin}${normalizedPath}`;
}

function buildCollectionShareText(
  booklist: BooklistShareSource,
  kind: '书单' | '赛事',
  path: string,
) {
  const url = buildAbsoluteUrl(path);
  return [
    `分享${kind}：《${booklist.title}》`,
    booklist.description?.trim() ? `简介：${booklist.description.trim()}` : null,
    `收录 ${booklist.item_count} 个帖子 · ${booklist.collection_count} 次收藏 · ${booklist.view_count} 次浏览`,
    booklist.is_public ? '公开书单' : '私有书单',
    url,
  ].filter(Boolean).join('\n');
}

export function buildBooklistShareText(booklist: BooklistShareSource) {
  return buildCollectionShareText(booklist, '书单', `/share/booklists/${booklist.id}`);
}

export function buildTournamentShareText(tournament: BooklistShareSource) {
  return buildCollectionShareText(tournament, '赛事', `/share/tournaments/${tournament.id}`);
}

export function buildAuthorShareText({ userId, authorName, stats }: AuthorShareSource) {
  const url = buildAbsoluteUrl(`/u/${userId}`);
  return [
    `分享作者：${authorName}`,
    `发布 ${stats.thread_count} 个帖子 · 收获 ${stats.reaction_count} 个点赞 · ${stats.reply_count} 条回复`,
    url,
  ].join('\n');
}

function fallbackCopyText(text: string) {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopyText(text);
    }
  }

  return fallbackCopyText(text);
}
