export const DEFAULT_API_BASE_URL = 'https://forum.shimmerday.top/v1';
const SITE_NAME = '类脑索引';

export function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function safeHttpUrl(value) {
  const candidate = cleanText(value);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function buildBooklistOgMetadata(booklist, pageUrl, fallbackImage) {
  const title = cleanText(booklist?.title) || '未命名书单';
  const description =
    cleanText(booklist?.description) ||
    (Number.isFinite(booklist?.item_count)
      ? `收录 ${booklist.item_count} 个帖子，来看看这份角色卡书单。`
      : '在类脑索引浏览大家整理的角色卡书单。');

  return {
    title: `《${title}》· ${SITE_NAME}`,
    description,
    image: safeHttpUrl(booklist?.image_url) || fallbackImage,
    url: pageUrl,
  };
}

export function buildTournamentOgMetadata(tournament, pageUrl, fallbackImage) {
  const title = cleanText(tournament?.title) || '未命名赛事';
  const description =
    cleanText(tournament?.description) ||
    (Number.isFinite(tournament?.item_count)
      ? `已有 ${tournament.item_count} 个参赛作品，来看看这场赛事。`
      : '在类脑索引浏览社区赛事与参赛作品。');

  return {
    title: `《${title}》· ${SITE_NAME}赛事`,
    description,
    image: safeHttpUrl(tournament?.image_url) || fallbackImage,
    url: pageUrl,
  };
}

export function buildThreadOgMetadata(thread, pageUrl, fallbackImage) {
  const title = cleanText(thread?.title) || '未命名帖子';
  const authorName = cleanText(thread?.author_name);
  const excerpt = cleanText(thread?.description);

  return {
    title: `《${title}》· ${SITE_NAME}`,
    description: excerpt || (authorName ? `${authorName}发布的作品。` : '在类脑索引查看这篇帖子。'),
    image: safeHttpUrl(thread?.image_url) || fallbackImage,
    url: pageUrl,
  };
}

export function buildAuthorOgMetadata(author, pageUrl, fallbackImage) {
  const name = cleanText(author?.display_name) || cleanText(author?.name) || '未知作者';
  const stats = author?.stats || {};
  const statistics = [
    Number.isFinite(stats.thread_count) ? `发布 ${stats.thread_count} 个作品` : null,
    Number.isFinite(stats.reaction_count) ? `收获 ${stats.reaction_count} 个点赞` : null,
    Number.isFinite(stats.reply_count) ? `${stats.reply_count} 条回复` : null,
  ].filter(Boolean);
  const latestTitle = cleanText(author?.latest_work_title);
  const description = [
    statistics.join(' · '),
    latestTitle ? `最新发布：《${latestTitle}》` : null,
  ].filter(Boolean).join('。') || `在类脑索引查看 ${name} 的作品。`;

  return {
    title: `${name} · ${SITE_NAME}`,
    description,
    image: safeHttpUrl(author?.image_url) || safeHttpUrl(author?.avatar_url) || fallbackImage,
    url: pageUrl,
  };
}

export function fetchAppShell(request, env) {
  return env.ASSETS.fetch(new URL('/', request.url));
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}

class ContentAttributeHandler {
  constructor(value) {
    this.value = value;
  }

  element(element) {
    element.setAttribute('content', this.value);
  }
}

class TitleHandler {
  constructor(value) {
    this.value = value;
  }

  element(element) {
    element.setInnerContent(this.value);
  }
}

function rewriteMetadata(response, metadata) {
  return new HTMLRewriter()
    .on('title', new TitleHandler(metadata.title))
    .on('meta[name="description"]', new ContentAttributeHandler(metadata.description))
    .on('meta[property="og:type"]', new ContentAttributeHandler('website'))
    .on('meta[property="og:url"]', new ContentAttributeHandler(metadata.url))
    .on('meta[property="og:title"]', new ContentAttributeHandler(metadata.title))
    .on('meta[property="og:description"]', new ContentAttributeHandler(metadata.description))
    .on('meta[property="og:image"]', new ContentAttributeHandler(metadata.image))
    .on('meta[name="twitter:title"]', new ContentAttributeHandler(metadata.title))
    .on('meta[name="twitter:description"]', new ContentAttributeHandler(metadata.description))
    .on('meta[name="twitter:image"]', new ContentAttributeHandler(metadata.image))
    .transform(response);
}

export function createShareMetadataHandler({ resourceName, endpoint, buildMetadata }) {
  return async function onRequestGet({ request, env, params }) {
    const requestUrl = new URL(request.url);
    const resourceId = String(params.id || '').trim();
    const shellResponse = await fetchAppShell(request, env);

    if (!/^\d+$/.test(resourceId)) return shellResponse;

    const token = cleanText(env.OG_SERVICE_TOKEN);
    if (!token) {
      console.error(`${resourceName} OG metadata failed: OG_SERVICE_TOKEN is missing`);
      return shellResponse;
    }

    try {
      const apiBaseUrl = cleanText(env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
      const data = await fetchJson(`${apiBaseUrl}${endpoint(resourceId)}`, token);

      requestUrl.search = '';
      requestUrl.hash = '';
      const fallbackImage = new URL('/og-image.png', requestUrl).href;
      return rewriteMetadata(
        shellResponse,
        buildMetadata(data, requestUrl.href, fallbackImage),
      );
    } catch (error) {
      console.error(`${resourceName} OG metadata failed`, error);
      return shellResponse;
    }
  };
}
