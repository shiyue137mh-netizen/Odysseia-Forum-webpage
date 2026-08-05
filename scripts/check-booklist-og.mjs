import assert from 'node:assert/strict';

import { buildBooklistOgMetadata, onRequestGet } from '../functions/booklists/[id].js';

const fallbackImage = 'https://example.com/og-image.png';
const imageUrl = 'https://cdn.discordapp.com/attachments/1/2/first.png';

const metadata = buildBooklistOgMetadata(
  { title: '夏夜收藏', description: '', image_url: imageUrl, item_count: 8 },
  'https://example.com/booklists/42',
  fallbackImage,
);
assert.deepEqual(metadata, {
  title: '《夏夜收藏》· 类脑索引',
  description: '收录 8 个帖子，来看看这份角色卡书单。',
  image: imageUrl,
  url: 'https://example.com/booklists/42',
});

assert.equal(
  buildBooklistOgMetadata(
    { title: '无图书单', description: '', image_url: 'javascript:alert(1)', item_count: 0 },
    'https://example.com/booklists/43',
    fallbackImage,
  ).image,
  fallbackImage,
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
      item_count: 1,
      updated_at: '2026-08-05T12:00:00Z',
    });
  }
  return new Response('not found', { status: 404 });
};

try {
  const response = await onRequestGet({
    request: new Request('https://example.com/booklists/42?from=share'),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      OG_SERVICE_TOKEN: 'test-service-token',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  const html = await response.text();

  assert.match(html, /<title>《夏夜收藏》· 类脑索引<\/title>/);
  assert.match(html, /property="og:description" content="沿着晚风整理的一组角色卡。"/);
  assert.match(html, /property="og:image" content="https:\/\/cdn\.discordapp\.com\/attachments\/1\/2\/first\.png"/);
  assert.match(html, /property="og:url" content="https:\/\/example\.com\/booklists\/42"/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.com/v1/internal/share-metadata/booklists/42');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer test-service-token');

  let missingTokenLogged = false;
  console.error = (message) => {
    if (message === 'Booklist OG metadata failed: OG_SERVICE_TOKEN is missing') {
      missingTokenLogged = true;
    }
  };
  const fallbackResponse = await onRequestGet({
    request: new Request('https://example.com/booklists/42'),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  assert.match(await fallbackResponse.text(), /<title>default<\/title>/);
  assert.equal(missingTokenLogged, true);
  assert.equal(requests.length, 1);
} finally {
  globalThis.fetch = originalFetch;
  globalThis.HTMLRewriter = originalHTMLRewriter;
  console.error = originalConsoleError;
}

console.log('booklist OG self-check passed');
