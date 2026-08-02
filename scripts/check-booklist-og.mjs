import assert from 'node:assert/strict';

import {
  buildBooklistOgMetadata,
  onRequestGet,
  selectBooklistOgImage,
} from '../functions/booklists/[id].js';

const fallbackImage = 'https://example.com/og-image.png';
const firstItem = {
  thumbnail_urls: ['https://cdn.discordapp.com/attachments/1/2/first.png'],
};

assert.equal(
  selectBooklistOgImage(
    { cover_image_url: 'https://example.com/custom-cover.png' },
    firstItem,
    fallbackImage,
  ),
  'https://example.com/custom-cover.png',
);
assert.equal(
  selectBooklistOgImage({ cover_image_url: null }, firstItem, fallbackImage),
  firstItem.thumbnail_urls[0],
);
assert.equal(
  selectBooklistOgImage({ cover_image_url: null }, { thumbnail_urls: [] }, fallbackImage),
  fallbackImage,
);

const metadata = buildBooklistOgMetadata(
  { title: '夏夜收藏', description: '', item_count: 8 },
  firstItem,
  'https://example.com/booklists/42',
  fallbackImage,
);
assert.deepEqual(metadata, {
  title: '《夏夜收藏》· 类脑索引',
  description: '收录 8 个帖子，来看看这份角色卡书单。',
  image: firstItem.thumbnail_urls[0],
  url: 'https://example.com/booklists/42',
});

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
const requestedUrls = [];

globalThis.HTMLRewriter = FakeHTMLRewriter;
globalThis.fetch = async (input) => {
  const url = String(input);
  requestedUrls.push(url);
  if (url.endsWith('/booklist/detail/42')) {
    return Response.json({
      id: 42,
      title: '夏夜收藏',
      description: '沿着晚风整理的一组角色卡。',
      cover_image_url: null,
      is_public: true,
      item_count: 1,
    });
  }
  if (url.includes('/booklist/item/list/page/42?')) {
    return Response.json({ total: 1, limit: 1, offset: 0, results: [firstItem] });
  }
  return new Response('not found', { status: 404 });
};

try {
  const response = await onRequestGet({
    request: new Request('https://example.com/booklists/42?from=share'),
    env: {
      API_BASE_URL: 'https://api.example.com/v1/',
      ASSETS: { fetch: async () => new Response(shell, { headers: { 'Content-Type': 'text/html' } }) },
    },
    params: { id: '42' },
  });
  const html = await response.text();

  assert.match(html, /<title>《夏夜收藏》· 类脑索引<\/title>/);
  assert.match(html, /property="og:description" content="沿着晚风整理的一组角色卡。"/);
  assert.match(html, /property="og:image" content="https:\/\/cdn\.discordapp\.com\/attachments\/1\/2\/first\.png"/);
  assert.match(html, /property="og:url" content="https:\/\/example\.com\/booklists\/42"/);
  assert.deepEqual(requestedUrls, [
    'https://api.example.com/v1/booklist/detail/42',
    'https://api.example.com/v1/booklist/item/list/page/42?limit=1&offset=0',
  ]);
} finally {
  globalThis.fetch = originalFetch;
  globalThis.HTMLRewriter = originalHTMLRewriter;
}

console.log('booklist OG self-check passed');
