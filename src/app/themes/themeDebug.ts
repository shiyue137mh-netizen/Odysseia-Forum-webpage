/**
 * 主题调试工具：排查背景图 / 毛玻璃未生效的问题。
 *
 * 仅在开发模式下由 ThemeProvider 动态载入，生产构建不会打包本模块。
 * 在浏览器控制台执行 `await window.odDebugTheme()` 使用。
 */

type DebugResult = {
  theme: string;
  glass: string | null;
  wallpaper: string | null;
  wallpaperVar: string;
  wallpaperOpacity: string;
  sample: Record<string, string>;
  opaqueBlocks: Array<{ tag: string; className: string; bg: string; area: number }>;
  imageLoad: { ok: boolean; width?: number; height?: number; error?: string };
};

type DebugWindow = Window & {
  odDebugTheme?: () => Promise<DebugResult>;
  odDebugThemeHelp?: () => void;
};

const parseAlpha = (color: string) => {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return 1;
  const parts = match[1].split(',').map((s) => s.trim());
  if (parts.length < 4) return 1;
  const alpha = Number(parts[3]);
  return Number.isFinite(alpha) ? alpha : 1;
};

const extractWallpaperUrl = (cssValue: string) => {
  const m = cssValue.match(/^url\((.*)\)$/i);
  if (!m) return '';
  return m[1].replace(/^['"]|['"]$/g, '').trim();
};

export function installThemeDebug() {
  const debugWindow = window as DebugWindow;

  debugWindow.odDebugTheme = async () => {
    const html = document.documentElement;
    const body = document.body;
    const main = document.getElementById('main-scroll-container');
    const csHtml = getComputedStyle(html);
    const csBody = getComputedStyle(body);
    const csMain = main ? getComputedStyle(main) : null;

    const wallpaperVar = csHtml.getPropertyValue('--od-wallpaper-image').trim();
    const wallpaperOpacity = csHtml.getPropertyValue('--od-wallpaper-opacity').trim();
    const imageUrl = extractWallpaperUrl(wallpaperVar);

    const sample = {
      odBg: csHtml.getPropertyValue('--od-bg').trim(),
      odBgSecondary: csHtml.getPropertyValue('--od-bg-secondary').trim(),
      odCard: csHtml.getPropertyValue('--od-card').trim(),
      odBorder: csHtml.getPropertyValue('--od-border').trim(),
      bodyBg: csBody.backgroundColor,
      bodyBgImage: csBody.backgroundImage,
      mainBg: csMain?.backgroundColor || 'N/A',
    };

    const opaqueBlocks = Array.from(
      document.querySelectorAll<HTMLElement>('div,main,section,aside,header'),
    )
      .map((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        return {
          el,
          bg: s.backgroundColor,
          alpha: parseAlpha(s.backgroundColor),
          area,
        };
      })
      .filter(
        (x) =>
          x.area > 120000 &&
          x.alpha >= 0.98 &&
          x.bg !== 'rgba(0, 0, 0, 0)' &&
          x.bg !== 'transparent',
      )
      .sort((a, b) => b.area - a.area)
      .slice(0, 10)
      .map((x) => ({
        tag: x.el.tagName.toLowerCase(),
        className: (x.el.className || '').toString().slice(0, 120),
        bg: x.bg,
        area: Math.round(x.area),
      }));

    const imageLoad = await new Promise<DebugResult['imageLoad']>((resolve) => {
      if (!imageUrl) {
        resolve({ ok: false, error: 'No wallpaper URL in --od-wallpaper-image' });
        return;
      }
      const img = new Image();
      img.onload = () => resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ ok: false, error: 'Image load failed (CORS/404/invalid URL)' });
      img.src = imageUrl;
    });

    const result: DebugResult = {
      theme: html.getAttribute('data-od-theme') || 'unknown',
      glass: html.getAttribute('data-od-glass'),
      wallpaper: html.getAttribute('data-od-wallpaper'),
      wallpaperVar,
      wallpaperOpacity,
      sample,
      opaqueBlocks,
      imageLoad,
    };

    console.group('[odDebugTheme]');
    console.log(result);
    console.table(result.sample);
    if (result.opaqueBlocks.length) {
      console.warn('Potential opaque blockers (top 10 by area):');
      console.table(result.opaqueBlocks);
    }
    console.groupEnd();

    return result;
  };

  debugWindow.odDebugThemeHelp = () => {
    console.log('Run: await window.odDebugTheme()');
    console.log(
      'It checks theme vars, wallpaper load status, and possible opaque parent blockers.',
    );
  };
}
