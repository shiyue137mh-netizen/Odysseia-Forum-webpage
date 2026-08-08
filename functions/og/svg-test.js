export async function onRequestGet({ request, env }) {
  const asset = await env.ASSETS.fetch(new URL('/og-assets/satori-svg-test.svg', request.url));
  return new Response(asset.body, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}
