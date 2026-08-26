export const DEFAULT_API_BASE_URL = 'https://forum.shimmerday.top/v1';
export const DEFAULT_OG_IMAGE_BASE_URL = 'https://odysseia-forum-og.vercel.app';
const SITE_NAME = '类脑索引';
const OG_IMAGE_REVISION = '20260827-1.5x';

export function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compactText(value) {
  return cleanText(value).replace(/\s+/g, ' ');
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  // ponytail: Discord 不公开稳定的预览字数；若后续确定平台上限，改为按平台生成描述。
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
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
  const introduction = truncateText(compactText(booklist?.description), 160);
  const statistics = [
    Number.isFinite(booklist?.stats?.item_count) ? `收录 ${booklist.stats.item_count} 个帖子` : null,
    Number.isFinite(booklist?.stats?.collection_count) ? `${booklist.stats.collection_count} 次收藏` : null,
    Number.isFinite(booklist?.stats?.view_count) ? `${booklist.stats.view_count} 次浏览` : null,
  ].filter(Boolean).join(' · ');
  const description = [
    introduction || '在类脑索引浏览大家整理的角色卡书单。',
    statistics,
  ].filter(Boolean).join(' · ');

  return {
    title: `《${title}》· ${SITE_NAME}`,
    description,
    image: safeHttpUrl(booklist?.image_url) || fallbackImage,
    url: pageUrl,
  };
}

export function buildTournamentOgMetadata(tournament, pageUrl, fallbackImage) {
  const title = cleanText(tournament?.title) || '未命名赛事';
  const introduction = truncateText(compactText(tournament?.description), 160);
  const statistics = [
    Number.isFinite(tournament?.stats?.item_count) ? `${tournament.stats.item_count} 个参赛作品` : null,
    Number.isFinite(tournament?.stats?.collection_count) ? `${tournament.stats.collection_count} 次收藏` : null,
    Number.isFinite(tournament?.stats?.view_count) ? `${tournament.stats.view_count} 次浏览` : null,
  ].filter(Boolean).join(' · ');
  const description = [
    introduction || '在类脑索引浏览社区赛事与参赛作品。',
    statistics,
  ].filter(Boolean).join(' · ');

  return {
    title: `《${title}》· ${SITE_NAME}赛事`,
    description,
    image: safeHttpUrl(tournament?.image_url) || fallbackImage,
    url: pageUrl,
  };
}

export function buildThreadOgMetadata(thread, pageUrl, fallbackImage) {
  const title = cleanText(thread?.title) || '未命名帖子';
  const authorName = cleanText(thread?.author?.display_name);
  const excerpt = truncateText(compactText(thread?.description), 160);
  const statistics = [
    Number.isFinite(thread?.stats?.reaction_count) ? `${thread.stats.reaction_count} 个点赞` : null,
    Number.isFinite(thread?.stats?.reply_count) ? `${thread.stats.reply_count} 条回复` : null,
    Number.isFinite(thread?.stats?.collection_count) ? `${thread.stats.collection_count} 次收藏` : null,
  ].filter(Boolean).join(' · ');
  const description = [
    excerpt || (authorName ? `${authorName}发布的作品。` : '在类脑索引查看这篇帖子。'),
    statistics,
  ].filter(Boolean).join(' · ');

  return {
    title: `《${title}》· ${SITE_NAME}`,
    description,
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
  const latestTitle = cleanText(author?.latest_work?.title);
  const description = [
    statistics.join(' · '),
    latestTitle ? `最新发布：《${latestTitle}》` : null,
  ].filter(Boolean).join('。') || `在类脑索引查看 ${name} 的作品。`;

  return {
    title: `${name} · ${SITE_NAME}`,
    description,
    image: safeHttpUrl(author?.avatar_url) || fallbackImage,
    url: pageUrl,
  };
}

export function fetchAppShell(request, env) {
  return env.ASSETS.fetch(new URL('/', request.url));
}

export function isSocialCrawler(request) {
  return /(Discordbot|Twitterbot|facebookexternalhit|Slackbot|TelegramBot|WhatsApp|LinkedInBot|Pinterest|Embedly|Googlebot|bingbot|Applebot)/i.test(
    request.headers.get('user-agent') || '',
  );
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

export function createShareMetadataHandler({
  resourceName,
  endpoint,
  buildMetadata,
  imageType,
  crawlerOnly = false,
}) {
  return async function onRequestGet({ request, env, params }) {
    const requestUrl = new URL(request.url);
    const resourceId = String(params.id || '').trim();
    if (!/^\d+$/.test(resourceId)) return fetchAppShell(request, env);

    if (crawlerOnly && !isSocialCrawler(request)) return fetchAppShell(request, env);

    const shellResponse = await fetchAppShell(request, env);

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
      const fallbackImage = new URL('/og-image-202608.png', requestUrl).href;
      const metadata = buildMetadata(data, requestUrl.href, fallbackImage);
      if (imageType) {
        const imageBaseUrl = cleanText(env.OG_IMAGE_BASE_URL || DEFAULT_OG_IMAGE_BASE_URL);
        const imageUrl = new URL(`/api/og/${imageType}/${resourceId}`, imageBaseUrl);
        imageUrl.searchParams.set('v', `${cleanText(data?.updated_at) || 'unknown'}-${OG_IMAGE_REVISION}`);
        metadata.image = imageUrl.href;
      }
      return rewriteMetadata(shellResponse, metadata);
    } catch (error) {
      console.error(`${resourceName} OG metadata failed`, error);
      return shellResponse;
    }
  };
}
