import { createElement as h } from 'react';

const iconShapes = {
  post: [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 2v6h6' }], ['path', { d: 'M8 13h8M8 17h6' }]],
  booklist: [['path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }], ['path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }]],
  tournament: [['path', { d: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z' }], ['path', { d: 'M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4' }]],
  author: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', { d: 'M4 22a8 8 0 0 1 16 0' }]],
  heart: [['path', { d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z' }]],
  message: [['path', { d: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' }]],
  bookmark: [['path', { d: 'M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z' }]],
  eye: [['path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
};

function visualLength(text) {
  return [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(String(text || ''))]
    .reduce((length, { segment }) => length + (/^[\x00-\xff]+$/.test(segment) ? 1 : 2), 0);
}

function titleSize(title, mode) {
  const length = visualLength(title);
  const sizes = mode === 'post'
    ? [[22, 50], [34, 43], [48, 36], [Infinity, 30]]
    : [[20, 44], [32, 38], [46, 33], [Infinity, 28]];
  return sizes.find(([limit]) => length <= limit)[1];
}

function authorNameSize(name) {
  const length = visualLength(name);
  return length <= 18 ? 43 : length <= 24 ? 38 : length <= 32 ? 33 : 28;
}

function descriptionSize(description) {
  const length = visualLength(description);
  return length <= 70 ? 19 : length <= 110 ? 17 : 15;
}

function icon(name, size = 18, color = '#e4e4e7') {
  return h('svg', {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color,
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  }, ...iconShapes[name].map(([tag, props], index) => h(tag, { key: index, ...props })));
}

function background(data, images) {
  return [
    h('img', { key: 'background', src: images[data.background].src, style: { position: 'absolute', top: '-4%', left: '-4%', width: '108%', height: '108%', objectFit: 'cover', filter: 'blur(8px) brightness(0.62) saturate(1.15)' } }),
    h('div', { key: 'overlay', style: { display: 'flex', position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(105deg, rgba(9,11,16,0.18) 0%, rgba(9,11,16,0.58) 58%, rgba(9,11,16,0.88) 100%)' } }),
  ];
}

function wordLogo(accent) {
  const paths = ['M 40 16 L 64 64 L 16 64 Z', 'M 16 16 L 40 40 L 40 64 M 40 40 L 64 16', 'M 60 16 L 24 16 L 44 40 L 24 64 L 60 64', 'M 60 16 L 24 16 L 44 40 L 24 64 L 60 64', 'M 60 16 L 24 16 L 24 64 L 60 64 M 24 40 L 52 40', 'M 40 16 L 40 64', 'M 16 64 L 40 16 L 64 64 M 26 44 L 54 44'];
  const props = { viewBox: '0 0 80 80', width: 11, height: 11, fill: 'none', stroke: '#a1a1aa', strokeWidth: 11, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return h('div', { style: { display: 'flex', width: 86, height: 11 } },
    h('svg', { ...props, key: 0 }, h('g', { transform: 'rotate(90 40 40)' }, h('path', { d: 'M 16 40 A 24 24 0 1 0 16 39.99 Z', strokeDasharray: '113 38', strokeDashoffset: 132 })), h('circle', { cx: 40, cy: 16, r: 6, fill: accent, stroke: 'none' })),
    ...paths.map((d, index) => h('svg', { ...props, key: index + 1 }, h('path', { d }))));
}

function brand(data, images) {
  return h('div', { style: { display: 'flex', position: 'absolute', top: 28, left: 34, alignItems: 'center', gap: 12, color: '#fff', fontSize: 17, letterSpacing: 1 } },
    h('img', { src: images.logo.src, style: { width: 42, height: 42, borderRadius: 12 } }),
    h('div', { style: { display: 'flex', flexDirection: 'column' } }, h('div', { style: { display: 'flex' } }, '类脑'), wordLogo(data.accent)));
}

function badge(data) {
  return h('div', { style: { display: 'flex', position: 'absolute', top: 34, right: 34, alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, color: data.accent, background: 'rgba(255,255,255,0.09)', border: `1px solid ${data.accent}66`, fontSize: 16, letterSpacing: 1.4 } }, icon(data.typeIcon, 18, data.accent), data.type);
}

function statPill([name, label, value]) {
  return h('div', { key: label, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.34)', border: '1px solid rgba(255,255,255,0.12)', color: '#e4e4e7', fontSize: 17, whiteSpace: 'nowrap' } }, icon(name), value);
}

function creator(data, images, size = 42) {
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18, color: '#d4d4d8', fontSize: visualLength(data.author) > 24 ? 14 : 17 } },
    h('img', { src: images.avatar.src, style: { width: size, height: size, borderRadius: 999, border: '3px solid rgba(255,255,255,0.28)', objectFit: 'cover' } }),
    h('div', { style: { display: 'flex' } }, data.author),
    data.createdAt ? h('div', { style: { display: 'flex', paddingLeft: 11, borderLeft: '1px solid rgba(255,255,255,0.18)', color: '#a1a1aa', fontSize: 14, whiteSpace: 'nowrap' } }, data.createdAt) : null);
}

function fitCover(image) {
  const ratio = image.width / image.height;
  const width = Math.min(640, 500 * ratio);
  return { width: Math.round(width), height: Math.round(width / ratio) };
}

function placeholder(title, accent, size = 44) {
  return h('div', { style: { display: 'flex', width: '100%', height: '100%', padding: 40, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', backgroundImage: `linear-gradient(145deg, ${accent}42, rgba(17,19,24,0.96))`, color: '#e4e4e7', fontSize: 22, lineHeight: 1.35 } }, icon('post', size, accent), h('div', { style: { display: 'flex', maxHeight: 160, overflow: 'hidden' } }, title));
}

function workCard(image, index, total, accent) {
  const distance = Math.abs(index - Math.floor(total / 2));
  const sizes = [{ width: 236, height: 410 }, { width: 132, height: 340 }, { width: 76, height: 278 }];
  const size = sizes[Math.min(distance, 2)];
  return h('div', { key: `${index}-${image?.src?.slice(-20) || image?.title}`, style: { display: 'flex', width: size.width, height: size.height, flexShrink: 0, overflow: 'hidden', borderRadius: 16, border: '2px solid rgba(255,255,255,0.20)', opacity: distance === 2 ? 0.68 : 1, filter: distance === 2 ? 'blur(1.2px) brightness(0.78) saturate(0.82)' : 'none', boxShadow: '0 18px 38px rgba(0,0,0,0.48)' } }, image?.src ? h('img', { src: image.src, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : placeholder(image?.title || '暂无封面', accent, distance === 0 ? 30 : 22));
}

function root(data, images, children) {
  return h('div', { lang: 'zh-CN', style: { display: 'flex', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#111318', color: '#fff', fontFamily: 'Odysseia Sans' } }, ...background(data, images), badge(data), ...children, brand(data, images));
}

function postLayout(data, images) {
  const cover = images[data.covers[0]];
  const size = cover?.src ? fitCover(cover) : { width: 500, height: 500 };
  return root(data, images, [
    h('div', { key: 'media', style: { display: 'flex', position: 'absolute', left: 30, top: 65, width: 700, height: 500, alignItems: 'center', justifyContent: 'center' } }, h('div', { style: { display: 'flex', width: size.width, height: size.height, overflow: 'hidden', borderRadius: 22, border: '3px solid rgba(255,255,255,0.34)', boxShadow: '0 22px 48px rgba(0,0,0,0.55)' } }, cover?.src ? h('img', { src: cover.src, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : placeholder(cover?.title || data.title, data.accent))),
    h('div', { key: 'info', style: { display: 'flex', position: 'absolute', left: 790, top: 82, width: 400, height: 500, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' } },
      h('div', { style: { display: 'flex', maxHeight: 174, overflow: 'hidden', marginBottom: 18, fontSize: titleSize(data.title, 'post'), lineHeight: 1.12, fontWeight: 700, textShadow: '0 4px 18px rgba(0,0,0,0.55)' } }, data.title),
      h('div', { style: { display: 'flex', maxHeight: 86, overflow: 'hidden', marginBottom: 22, color: '#d4d4d8', fontSize: descriptionSize(data.description), lineHeight: 1.5 } }, data.description),
      creator(data, images), h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, ...data.stats.map(statPill))),
  ]);
}

function collectionLayout(data, images) {
  const covers = data.covers.map((name) => images[name]);
  const authorMode = data.typeIcon === 'author';
  const info = authorMode ? [
    h('div', { key: 'identity', style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 } }, h('img', { src: images.avatar.src, style: { width: 84, height: 84, borderRadius: 999, border: '3px solid rgba(255,255,255,0.28)', objectFit: 'cover' } }), h('div', { style: { display: 'flex', flexDirection: 'column', width: 300 } }, h('div', { style: { display: 'flex', maxHeight: 104, overflow: 'hidden', fontSize: authorNameSize(data.author), lineHeight: 1.08, fontWeight: 700 } }, data.author), h('div', { style: { display: 'flex', marginTop: 8, color: '#a1a1aa', fontSize: 14 } }, data.createdAt))),
    h('div', { key: 'stats', style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 } }, ...data.stats.map(statPill)),
    h('div', { key: 'latest', style: { display: 'flex', flexDirection: 'column' } }, h('div', { style: { display: 'flex', color: '#a1a1aa', fontSize: 14, letterSpacing: 1 } }, data.description), h('div', { style: { display: 'flex', maxHeight: 70, overflow: 'hidden', marginTop: 7, fontSize: Math.min(27, titleSize(data.title, 'collection')), lineHeight: 1.25, fontWeight: 700 } }, data.title)),
  ] : [
    h('div', { key: 'title', style: { display: 'flex', maxHeight: 162, overflow: 'hidden', marginBottom: 16, fontSize: titleSize(data.title, 'collection'), lineHeight: 1.12, fontWeight: 700 } }, data.title),
    h('div', { key: 'description', style: { display: 'flex', maxHeight: 86, overflow: 'hidden', marginBottom: 22, color: '#d4d4d8', fontSize: descriptionSize(data.description), lineHeight: 1.5 } }, data.description),
    creator(data, images), h('div', { key: 'stats', style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, ...data.stats.map(statPill)),
  ];
  return root(data, images, [
    h('div', { key: 'media', style: { display: 'flex', position: 'absolute', left: 30, top: 65, width: 700, height: 500, alignItems: 'center', justifyContent: 'center', gap: 13 } }, ...covers.map((image, index) => workCard(image, index, covers.length, data.accent))),
    h('div', { key: 'info', style: { display: 'flex', position: 'absolute', left: 790, top: 82, width: 400, height: 500, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' } }, ...info),
  ]);
}

export function renderOgLayout(data, images) {
  return data.typeIcon === 'post' ? postLayout(data, images) : collectionLayout(data, images);
}

export function collectFontText(data) {
  return ['类脑', data.type, data.title, data.description, data.author, data.createdAt, ...data.stats.flat()].filter(Boolean).join('');
}
