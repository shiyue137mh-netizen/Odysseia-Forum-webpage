import assert from 'node:assert/strict';

import { onRequestGet as onBooklistRequestGet } from '../functions/booklists/[id].js';
import { onRequestGet as onThreadRequestGet } from '../functions/threads/[id].js';
import { onRequestGet as onTournamentRequestGet } from '../functions/tournaments/[id].js';
import {
  buildAuthorOgMetadata,
  buildBooklistOgMetadata,
  buildThreadOgMetadata,
  buildTournamentOgMetadata,
} from '../functions/_shared/og.js';

const fallbackImage = 'https://example.com/og-image.png';
const imageUrl = 'https://cdn.discordapp.com/attachments/1/2/first.png';

const metadata = buildBooklistOgMetadata(
  {
    title: '夏夜收藏',
    description: '沿着晚风整理的一组角色卡。',
    image_url: imageUrl,
    stats: { item_count: 8, collection_count: 3, view_count: 120 },
  },
  'https://example.com/booklists/42',
  fallbackImage,
);
assert.deepEqual(metadata, {
  title: '《夏夜收藏》· 类脑索引',
  description: '沿着晚风整理的一组角色卡。 · 收录 8 个帖子 · 3 次收藏 · 120 次浏览',
  image: imageUrl,
  url: 'https://example.com/booklists/42',
});

assert.equal(
  buildBooklistOgMetadata(
    { title: '无图书单', description: '', image_url: 'javascript:alert(1)', stats: { item_count: 0 } },
    'https://example.com/booklists/43',
    fallbackImage,
  ).image,
  fallbackImage,
);

const longDescription = buildBooklistOgMetadata(
  {
    title: '长简介书单',
    description: '很长的简介'.repeat(80),
    stats: { item_count: 2, collection_count: 1, view_count: 95 },
  },
  'https://example.com/booklists/44',
  fallbackImage,
).description;
assert.match(longDescription, /… · 收录 2 个帖子 · 1 次收藏 · 95 次浏览$/);

assert.deepEqual(
  buildTournamentOgMetadata(
    { title: '夏夜祭', description: '', image_url: imageUrl, stats: { item_count: 16 } },
    'https://example.com/tournaments/42',
    fallbackImage,
  ),
  {
    title: '《夏夜祭》· 类脑索引赛事',
    description: '在类脑索引浏览社区赛事与参赛作品。 · 16 个参赛作品',
    image: imageUrl,
    url: 'https://example.com/tournaments/42',
  },
);

assert.match(
  buildThreadOgMetadata(
    { title: '海边角色卡', description: '', author: { display_name: '秋青子' }, image_url: imageUrl },
    'https://example.com/threads/99',
    fallbackImage,
  ).description,
  /秋青子发布的作品/,
);

assert.deepEqual(
  buildAuthorOgMetadata(
    {
      display_name: '秋青子',
      avatar_url: 'https://example.com/avatar.png',
      stats: { thread_count: 12, reaction_count: 345, reply_count: 67 },
      latest_work: { title: '蛇与夏夜' },
    },
    'https://example.com/u/123',
    fallbackImage,
  ),
  {
    title: '秋青子 · 类脑索引',
    description: '发布 12 个作品 · 收获 345 个点赞 · 67 条回复。最新发布：《蛇与夏夜》',
    image: 'https://example.com/avatar.png',
    url: 'https://example.com/u/123',
  },
);

const shell = `<!doctype html><html><head>
  <meta name="description" content="default">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:title" content="default">
  <meta property="og:description" content="default">
  <meta property="og:image" content="https://example.com/og-image.png">
  <meta name="twitter:title" content="default">
  <meta name="twitter:description" content="default">
  <meta name="twitter:image" content="https://example.com/og-image.png">
  <title>default</title>
</head><body><div id="root"></div></body></html>`;

class FakeHTMLRewriter {
  handlers = [];

  on(selector, handler) {
    this.handlers.push({ selector, handler });
    return this;
  }

  async transform(response) {
    let html = await response.text();
    for (const { selector, handler } of this.handlers) {
      if (selector === 'title') {
        let value = '';
        handler.element({ setInnerContent(next) { value = next; } });
        html = html.replace(/<title>.*?<\/title>/s, `<title>${value}</title>`);
        continue;
      }

      const nameMatch = selector.match(/^meta\[(name|property)="(.+)"\]$/);
      assert.ok(nameMatch, `unexpected selector: ${selector}`);
      let value = '';
      handler.element({ setAttribute(name, next) { if (name === 'content') value = next; } });
      const [, attribute, key] = nameMatch;
      const pattern = new RegExp(`(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*(")`);
      html = html.replace(pattern, `$1${value}$2`);
    }
    return new Response(html, response);
  }
}

const originalFetch = globalThis.fetch;
const originalHTMLRewriter = globalThis.HTMLRewriter;
const originalConsoleError = console.error;
const requests = [];

globalThis.HTMLRewriter = FakeHTMLRewriter;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  requests.push({ url, init });
  if (url.endsWith('/internal/share-metadata/booklists/42')) {
    return Response.json({
      title: '夏夜收藏',
      description: '沿着晚风整理的一组角色卡。',
      image_url: imageUrl,
      stats: { item_count: 1, collection_count: 2, view_count: 30 },
      updated_at: '2026-08-05T12:00:00Z',
    });
  }
  if (url.endsWith('/internal/share-metadata/threads/99')) {
    return Response.json({
      title: '海边角色卡',
      description: '沿着海岸散步。',
      author: { display_name: '秋青子' },
      stats: { reaction_count: 4, reply_count: 2, collection_count: 1 },
      updated_at: '2026-08-06T12:00:00Z',
    });
  }
  return new Response('not found', { status: 404 });
};

try {
  const response = await onBooklistRequestGet({
    request: new Request('https://example.com/booklists/42', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0)' },
    }),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      OG_SERVICE_TOKEN: 'test-service-token',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  const html = await response.text();

  assert.match(html, /<title>《夏夜收藏》· 类脑索引<\/title>/);
  assert.match(html, /property="og:description" content="沿着晚风整理的一组角色卡。 · 收录 1 个帖子 · 2 次收藏 · 30 次浏览"/);
  assert.match(html, /property="og:image" content="https:\/\/odysseia-forum-og\.vercel\.app\/api\/og\/booklists\/42\?v=2026-08-05T12%3A00%3A00Z-20260827-emoji"/);
  assert.match(html, /property="og:url" content="https:\/\/example\.com\/booklists\/42"/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.com/v1/internal/share-metadata/booklists/42');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer test-service-token');

  const canonicalResponse = await onBooklistRequestGet({
    request: new Request('https://example.com/booklists/42'),
    env: {
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  assert.match(await canonicalResponse.text(), /<title>default<\/title>/);
  assert.equal(requests.length, 1);

  const normalThreadResponse = await onThreadRequestGet({
    request: new Request('https://example.com/threads/99'),
    env: {
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '99' },
  });
  assert.match(await normalThreadResponse.text(), /<title>default<\/title>/);
  assert.equal(requests.length, 1);

  const crawlerThreadResponse = await onThreadRequestGet({
    request: new Request('https://example.com/threads/99', {
      headers: { 'User-Agent': 'Discordbot/2.0' },
    }),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      OG_SERVICE_TOKEN: 'test-service-token',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '99' },
  });
  const crawlerThreadHtml = await crawlerThreadResponse.text();
  assert.match(crawlerThreadHtml, /<title>《海边角色卡》· 类脑索引<\/title>/);
  assert.match(crawlerThreadHtml, /property="og:image" content="https:\/\/odysseia-forum-og\.vercel\.app\/api\/og\/threads\/99\?v=2026-08-06T12%3A00%3A00Z-20260827-emoji"/);
  assert.equal(requests.length, 2);

  const tournamentResponse = await onTournamentRequestGet({
    request: new Request('https://example.com/tournaments/42', {
      headers: { 'User-Agent': 'Discordbot/2.0' },
    }),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      OG_SERVICE_TOKEN: 'test-service-token',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  const tournamentHtml = await tournamentResponse.text();
  assert.match(tournamentHtml, /<title>《夏夜收藏》· 类脑索引赛事<\/title>/);
  assert.match(tournamentHtml, /property="og:url" content="https:\/\/example\.com\/tournaments\/42"/);
  assert.equal(requests.length, 3);
  assert.equal(requests[2].url, 'https://api.example.com/v1/internal/share-metadata/booklists/42');

  let missingTokenLogged = false;
  console.error = (message) => {
    if (message === 'Booklist OG metadata failed: OG_SERVICE_TOKEN is missing') {
      missingTokenLogged = true;
    }
  };
  const fallbackResponse = await onBooklistRequestGet({
    request: new Request('https://example.com/booklists/42', {
      headers: { 'User-Agent': 'Discordbot/2.0' },
    }),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  assert.match(await fallbackResponse.text(), /<title>default<\/title>/);
  assert.equal(missingTokenLogged, true);
  assert.equal(requests.length, 3);
} finally {
  globalThis.fetch = originalFetch;
  globalThis.HTMLRewriter = originalHTMLRewriter;
  console.error = originalConsoleError;
}

console.log('dynamic OG self-check passed');
