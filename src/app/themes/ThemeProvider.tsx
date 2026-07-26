import { ReactNode, useEffect } from 'react';

import {
  applyBaseTokens,
  applySurfaceTokens,
  applyTypographyTokens,
  ensureThemeFontLink,
} from '@/app/themes/applyThemeTokens';
import { WallpaperBackdrop } from '@/app/themes/WallpaperBackdrop';
import { useThemeSettings } from '@/shared/hooks/useSettings';
import { useTheme } from '@/shared/hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, currentTheme } = useTheme();
  const settings = useThemeSettings();

  // 所有 CSS 变量在同一个 effect 里一次性写入，避免分批更新造成中间态闪烁。
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const fontFamily =
      (settings.fontMode === 'theme' ? theme.font?.family : null) ?? null;

    applyBaseTokens(root, theme.colors, settings.glassBlur);
    applyTypographyTokens(root, theme.typography, fontFamily);
    ensureThemeFontLink(theme.font, fontFamily);
    const { hasWallpaper, glassEnabled } = applySurfaceTokens(
      root,
      theme.colors,
      settings,
    );

    root.setAttribute('data-od-glass', glassEnabled ? 'on' : 'off');
    root.setAttribute('data-od-wallpaper', hasWallpaper ? 'on' : 'off');
    root.setAttribute('data-od-backgroundless', settings.backgroundlessMode ? 'on' : 'off');

    // 背景图的实际渲染交给 <WallpaperBackdrop/>（通过真实 DOM + inline style 挂 url，
    // 规避超长 base64 data URL 经由 CSS 自定义属性 + var() 展开时被部分浏览器静默回退的问题）。
    // 因此这里始终把 body::before 的 wallpaper 图像关掉，仅保留 ::after 的暗化层。
    root.style.setProperty('--od-wallpaper-image', 'none');
    root.style.setProperty('--od-wallpaper-opacity', '0');

    // 方便调试：在 html 标签上标记当前主题
    root.setAttribute('data-od-theme', currentTheme);

    // 主题调试工具仅在开发模式下挂载，生产构建不会打包 themeDebug 模块
    if (import.meta.env.DEV) {
      void import('./themeDebug').then((m) => m.installThemeDebug());
    }
    // useThemeSettings 内部用 useShallow，settings 引用仅在相关字段变化时更新，
    // 因此这里可以安全地依赖整个对象。
  }, [theme, currentTheme, settings]);

  return (
    <>
      <WallpaperBackdrop />
      {children}
    </>
  );
}
