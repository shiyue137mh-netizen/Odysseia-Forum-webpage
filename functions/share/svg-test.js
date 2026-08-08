export function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const test = requestUrl.searchParams.get('test');
  const imageUrl = new URL('/og/svg-test', requestUrl);
  if (/^[\w-]{1,32}$/.test(test || '')) imageUrl.searchParams.set('test', test);

  const title = '类脑索引 SVG OG 兼容性测试';
  const description = '静态 Satori SVG，仅用于验证 Discord 是否接受 SVG 格式的 og:image。';
  return new Response(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl.href}">
  <meta property="og:image:type" content="image/svg+xml">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${imageUrl.href}">
</head>
<body><p>SVG OG compatibility test.</p></body>
</html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
