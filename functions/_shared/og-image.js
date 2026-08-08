import { Resvg, initWasm as initResvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import satori, { init as initSatori } from 'satori/standalone';
import yogaWasm from 'satori/yoga.wasm';

import { renderOgLayout, collectFontText } from './og-image-template.js';
import { cleanText, DEFAULT_API_BASE_URL, safeHttpUrl } from './og.js';

const WIDTH = 1200;
const HEIGHT = 630;
const SCALE = 1;
const BACKGROUNDS = ['apple', 'garden', 'railways', 'rainyday', 'roof', 'space', 'vending_machine'];
const emojiCache = new Map();
let wasmPromise;

function initializeWasm() {
  wasmPromise ||= Promise.all([initSatori(yogaWasm), initResvg(resvgWasm)]);
  return wasmPromise;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function formatDate(value) {
  return cleanText(value).slice(0, 10);
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '0';
}

function compact(value, limit = 180) {
  const text = cleanText(value).replace(/\s+/g, ' ');
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

function pickBackground(key) {
  const hash = [...String(key)].reduce((value, character) => ((value * 31) + character.codePointAt(0)) >>> 0, 0);
  return BACKGROUNDS[hash % BACKGROUNDS.length];
}

function arrangeCenterFirst(items) {
  if (items.length < 2) return items;
  const arranged = Array(items.length);
  const center = Math.floor(items.length / 2);
  items.forEach((item, index) => {
    if (index === 0) arranged[center] = item;
    else {
      const distance = Math.ceil(index / 2);
      arranged[center + (index % 2 === 1 ? -distance : distance)] = item;
    }
  });
  return arranged;
}

function readDimensions(bytes, contentType) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (contentType === 'image/png' && bytes.length >= 24) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (contentType === 'image/gif' && bytes.length >= 10) return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  if (contentType === 'image/jpeg') {
    const frames = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (frames.has(marker)) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      const length = view.getUint16(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
  }
  // ponytail: 未识别格式按方图显示；后端返回宽高后删除此回退。
  return { width: 1, height: 1 };
}

async function loadImage(response) {
  if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
  const contentType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { src: `data:${contentType};base64,${bytesToBase64(bytes)}`, ...readDimensions(bytes, contentType) };
}

async function fetchRemoteImage(url) {
  return loadImage(await fetch(url, { signal: AbortSignal.timeout(8000) }));
}

async function fetchAssetImage(env, requestUrl, path) {
  return loadImage(await env.ASSETS.fetch(new URL(path, requestUrl)));
}

function sizedAvatarUrl(value) {
  const url = safeHttpUrl(value);
  if (!url || !url.includes('cdn.discordapp.com/')) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('size', '256');
  return parsed.href;
}

async function fetchMetadata(env, resource, id) {
  const base = cleanText(env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
  const response = await fetch(`${base}/internal/share-metadata/${resource}/${id}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${cleanText(env.OG_SERVICE_TOKEN)}` },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
  return response.json();
}

async function loadBaseImages(env, request, key) {
  const background = pickBackground(key);
  const [backgroundImage, logo] = await Promise.all([
    fetchAssetImage(env, request.url, `/og-assets/backgrounds/${background}.jpg`),
    fetchAssetImage(env, request.url, '/og-assets/server-logo-128.png'),
  ]);
  return { background, images: { [background]: backgroundImage, logo, avatar: logo } };
}

async function loadAvatar(url, fallback) {
  const candidate = sizedAvatarUrl(url);
  return candidate ? fetchRemoteImage(candidate).catch(() => fallback) : fallback;
}

async function loadWorks(works, images, prefix) {
  const candidates = (Array.isArray(works) ? works : [])
    .filter((work) => safeHttpUrl(work?.image_url))
    .slice(0, 5);
  const loaded = await Promise.all(candidates.map(async (work, index) => {
    const key = `${prefix}${index}`;
    const image = await fetchRemoteImage(safeHttpUrl(work.image_url)).catch(() => null);
    return image ? [key, image] : null;
  }));
  const entries = loaded.filter(Boolean);
  Object.assign(images, Object.fromEntries(entries));
  return arrangeCenterFirst(entries.map(([key]) => key));
}

async function prepareData(type, id, metadata, env, request) {
  const base = await loadBaseImages(env, request, `${type}:${id}`);
  const { images } = base;
  const author = metadata.author || {};
  images.avatar = await loadAvatar(type === 'author' ? metadata.avatar_url : author.avatar_url, images.logo);

  if (type === 'thread') {
    const imageUrl = safeHttpUrl(metadata.image_url);
    images.cover = imageUrl ? await fetchRemoteImage(imageUrl).catch(() => null) : null;
    images.cover ||= { src: null, title: compact(metadata.title, 90) || '暂无封面' };
    return { images, data: {
      type: '帖子 / POST', typeIcon: 'post', accent: '#c084fc', background: base.background, covers: ['cover'],
      title: compact(metadata.title, 100) || '未命名帖子', description: compact(metadata.description) || '在类脑索引查看这篇作品。',
      author: compact(author.display_name, 48) || '未知作者', createdAt: formatDate(metadata.created_at) ? `发布于 ${formatDate(metadata.created_at)}` : '',
      stats: [['heart', '反应', formatNumber(metadata.stats?.reaction_count)], ['message', '回复', formatNumber(metadata.stats?.reply_count)], ['bookmark', '收藏', formatNumber(metadata.stats?.collection_count)]],
    } };
  }

  const covers = await loadWorks(metadata.works, images, 'work');
  if (covers.length === 0) return null;
  if (type === 'author') return { images, data: {
    type: '作者 / CREATOR', typeIcon: 'author', accent: '#34d399', background: base.background, covers,
    title: compact(metadata.latest_work?.title, 90) || '暂无公开作品', description: '最新发布',
    author: compact(metadata.display_name, 64) || '未知作者', createdAt: formatDate(metadata.latest_work?.created_at) ? `最新发布于 ${formatDate(metadata.latest_work.created_at)}` : '',
    stats: [['post', '作品', formatNumber(metadata.stats?.thread_count)], ['heart', '反应', formatNumber(metadata.stats?.reaction_count)], ['message', '回复', formatNumber(metadata.stats?.reply_count)]],
  } };

  const tournament = type === 'tournament';
  return { images, data: {
    type: tournament ? '赛事 / EVENT' : '书单 / COLLECTION', typeIcon: tournament ? 'tournament' : 'booklist',
    accent: tournament ? '#fbbf24' : '#60a5fa', background: base.background, covers,
    title: compact(metadata.title, 100) || (tournament ? '未命名赛事' : '未命名书单'),
    description: compact(metadata.description) || (tournament ? '浏览社区赛事与参赛作品。' : '浏览作者整理的精选作品。'),
    author: compact(author.display_name, 48) || (tournament ? '赛事组织者' : '书单创建者'),
    createdAt: formatDate(metadata.created_at) ? `创建于 ${formatDate(metadata.created_at)}` : '',
    stats: [['post', tournament ? '参赛作品' : '收录', formatNumber(metadata.stats?.item_count)], ['bookmark', '收藏', formatNumber(metadata.stats?.collection_count)], ['eye', '浏览', formatNumber(metadata.stats?.view_count)]],
  } };
}

async function loadFont(text) {
  const characters = [...new Set([...text].filter((character) => !/\p{Extended_Pictographic}/u.test(character)))].join('');
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400&display=swap&text=${encodeURIComponent(characters)}`;
  const css = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }).then((response) => response.text());
  const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error('Google Fonts did not return a font URL');
  return fetch(fontUrl, { signal: AbortSignal.timeout(8000) }).then((response) => response.arrayBuffer());
}

async function loadEmoji(code, segment) {
  if (code !== 'emoji') return undefined;
  if (emojiCache.has(segment)) return emojiCache.get(segment);
  const codePoint = [...segment].map((character) => character.codePointAt(0).toString(16)).filter((value) => value !== 'fe0f').join('-');
  const response = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return undefined;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const data = `data:image/svg+xml;base64,${bytesToBase64(bytes)}`;
  emojiCache.set(segment, data);
  return data;
}

async function renderSvg(data, images, mark) {
  await initializeWasm();
  mark('wasm');
  const font = await loadFont(collectFontText(data));
  mark('font');
  const svg = await satori(renderOgLayout(data, images), {
    width: WIDTH,
    height: HEIGHT,
    pointScaleFactor: SCALE,
    fonts: [{ name: 'Odysseia Sans', data: font, weight: 400, style: 'normal' }],
    loadAdditionalAsset: loadEmoji,
  });
  mark('satori');
  return svg;
}

async function renderPng(data, images, mark) {
  const svg = await renderSvg(data, images, mark);
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH * SCALE },
    background: 'rgba(17,19,24,1)',
    imageRendering: 0,
    textRendering: 2,
  });
  const rendered = renderer.render();
  const png = rendered.asPng();
  rendered.free();
  renderer.free();
  mark('resvg');
  return png;
}

function defaultOg(request, env) {
  return env.ASSETS.fetch(new URL('/og-image-202608.png', request.url));
}

export function createOgImageHandler({ type, endpoint }) {
  return async function onRequestGet(context) {
    const { request, env, params } = context;
    const id = String(params.id || '').trim();
    if (!/^\d+$/.test(id) || !cleanText(env.OG_SERVICE_TOKEN)) return defaultOg(request, env);
    const startedAt = performance.now();
    const mark = (stage) => console.log('OG image timing', { type, stage, elapsedMs: Math.round(performance.now() - startedAt) });
    const returnSvg = new URL(request.url).searchParams.get('format') === 'svg';
    const cache = caches.default;
    const cached = returnSvg ? null : await cache.match(request);
    if (cached) return cached;
    try {
      const metadata = await fetchMetadata(env, endpoint, id);
      mark('metadata');
      if (!metadata) return defaultOg(request, env);
      const prepared = await prepareData(type, id, metadata, env, request);
      mark('images');
      if (!prepared) return defaultOg(request, env);
      if (returnSvg) {
        const svg = await renderSvg(prepared.data, prepared.images, mark);
        return new Response(svg, {
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Robots-Tag': 'noindex',
          },
        });
      }
      const png = await renderPng(prepared.data, prepared.images, mark);
      const response = new Response(png, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
      context.waitUntil(cache.put(request, response.clone()));
      return response;
    } catch (error) {
      console.error(`${type} OG image failed`, error instanceof Error ? error.message : error);
      return defaultOg(request, env);
    }
  };
}
