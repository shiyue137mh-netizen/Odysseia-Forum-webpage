const DEFAULT_API_BASE_URL = 'https://forum.shimmerday.top/v1';
const SITE_NAME = '类脑索引';
const DEFAULT_DESCRIPTION = '在类脑索引浏览大家整理的角色卡书单。';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeHttpUrl(value) {
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
      : DEFAULT_DESCRIPTION);

  return {
    title: `《${title}》· ${SITE_NAME}`,
    description,
    image: safeHttpUrl(booklist?.image_url) || fallbackImage,
    url: pageUrl,
  };
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}

async function loadBooklist(apiBaseUrl, booklistId, token) {
  return fetchJson(`${apiBaseUrl}/internal/share-metadata/booklists/${booklistId}`, token);
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

export async function onRequestGet({ request, env, params }) {
  const requestUrl = new URL(request.url);
  const booklistId = String(params.id || '').trim();
  const shellUrl = new URL('/', requestUrl);
  const shellResponse = await env.ASSETS.fetch(shellUrl);

  if (!/^\d+$/.test(booklistId)) return shellResponse;

  const token = cleanText(env.OG_SERVICE_TOKEN);
  if (!token) {
    console.error('Booklist OG metadata failed: OG_SERVICE_TOKEN is missing');
    return shellResponse;
  }

  try {
    const apiBaseUrl = cleanText(env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
    const booklist = await loadBooklist(apiBaseUrl, booklistId, token);

    requestUrl.search = '';
    requestUrl.hash = '';
    const fallbackImage = new URL('/og-image.png', requestUrl).href;
    const metadata = buildBooklistOgMetadata(booklist, requestUrl.href, fallbackImage);

    return rewriteMetadata(shellResponse, metadata);
  } catch (error) {
    console.error('Booklist OG metadata failed', error);
    return shellResponse;
  }
}
