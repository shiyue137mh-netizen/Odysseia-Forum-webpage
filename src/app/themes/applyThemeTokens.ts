import type { Theme } from "@/shared/styles/themes";

type ThemeColors = Theme["colors"];
type ThemeTypography = Theme["typography"];

interface SurfaceSettings {
  backgroundImageEnabled: boolean;
  backgroundImageOpacity: number;
  backgroundImageUrl: string;
  backgroundImageBase64?: string;
  glassMode: "on" | "off" | "auto";
  backgroundlessMode: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mixWithTransparency = (color: string, transparencyPercent: number) =>
  `color-mix(in srgb, ${color}, transparent ${clamp(transparencyPercent, 0, 100)}%)`;

/** 文本 / 强调 / 语义色 / 玻璃模糊等与表面无关的基础变量。 */
export function applyBaseTokens(
  root: HTMLElement,
  colors: ThemeColors,
  glassBlur: number,
) {
  root.style.setProperty("--od-text-primary", colors.textPrimary);
  root.style.setProperty("--od-text-secondary", colors.textSecondary);
  root.style.setProperty("--od-text-tertiary", colors.textTertiary);
  root.style.setProperty("--od-text-heading", colors.textHeading);
  root.style.setProperty("--od-text-label", colors.textLabel);
  root.style.setProperty("--od-text-meta", colors.textMeta);
  root.style.setProperty("--od-text-link", colors.textLink);
  root.style.setProperty("--od-text-value", colors.textValue);
  root.style.setProperty("--od-text-emphasis", colors.textEmphasis);
  root.style.setProperty("--od-accent", colors.accent);
  root.style.setProperty("--od-accent-hover", colors.accentHover);
  root.style.setProperty("--od-link", colors.link);
  root.style.setProperty("--od-link-hover", colors.linkHover);
  root.style.setProperty("--od-border", colors.border);
  root.style.setProperty("--od-border-strong", colors.borderStrong);
  root.style.setProperty("--od-success", colors.success);
  root.style.setProperty("--od-warning", colors.warning);
  root.style.setProperty("--od-error", colors.error);
  root.style.setProperty("--od-info", colors.info);
  root.style.setProperty(
    "--od-glass-blur",
    `${Math.max(0, Math.min(32, glassBlur))}px`,
  );
}

/** 字号 / 字重刻度与正文字体族。fontFamily 为 null 时退回系统字体栈。 */
export function applyTypographyTokens(
  root: HTMLElement,
  typography: ThemeTypography,
  fontFamily: string | null,
) {
  root.style.setProperty("--od-type-title", typography.typeScaleTitle);
  root.style.setProperty(
    "--od-type-section",
    "clamp(1.2rem, 1.05rem + 0.55vw, 1.65rem)",
  );
  root.style.setProperty("--od-type-hero", "clamp(2rem, 1.4rem + 2vw, 3.5rem)");
  root.style.setProperty("--od-type-label", typography.typeScaleLabel);
  root.style.setProperty("--od-type-body", typography.typeScaleBody);
  root.style.setProperty("--od-type-meta", typography.typeScaleMeta);
  root.style.setProperty("--od-type-code", typography.typeScaleCode);
  root.style.setProperty("--od-weight-strong", typography.fontWeightStrong);
  root.style.setProperty("--od-weight-medium", typography.fontWeightMedium);
  root.style.setProperty("--od-weight-regular", typography.fontWeightRegular);
  root.style.setProperty(
    "--font-sans",
    fontFamily
      ? `'${fontFamily}', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
      : "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  );
}

const loadedFontLinks = new Map<string, HTMLLinkElement>();

/** 按需注入主题字体的 <link>，同一 URL 只注入一次。 */
export function ensureThemeFontLink(
  font: Theme["font"],
  fontFamily: string | null,
) {
  if (!fontFamily || !font?.url || loadedFontLinks.has(font.url)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.url;
  link.setAttribute("data-od-font", fontFamily);
  document.head.appendChild(link);
  loadedFontLinks.set(font.url, link);
}

/**
 * 背景 / 卡片 / 分隔线等表面变量，按三种模式写入：
 * 壁纸模式做算法化透明（只透明表面与边框，文本保持实色）；
 * 常规模式用主题实色；无背景模式把表面全部置透明。
 * 返回派生的开关状态供 data 属性使用。
 */
export function applySurfaceTokens(
  root: HTMLElement,
  colors: ThemeColors,
  settings: SurfaceSettings,
) {
  const wallpaperUrl =
    settings.backgroundImageBase64?.trim() || settings.backgroundImageUrl.trim();
  const hasWallpaper = settings.backgroundImageEnabled && wallpaperUrl.length > 0;
  const supportsBackdrop =
    typeof CSS !== "undefined" && CSS.supports("backdrop-filter: blur(1px)");
  const glassEnabled =
    hasWallpaper &&
    (settings.glassMode === "on" ||
      (settings.glassMode === "auto" && supportsBackdrop));

  if (hasWallpaper) {
    // Engram-like algorithmic transparency:
    // - only surface/border tokens are transparentized
    // - text colors remain solid for readability
    // - borders keep higher opacity (resistance)
    const visible = clamp(settings.backgroundImageOpacity, 0, 1);
    const surfaceTransparency = Math.round(60 - visible * 30);
    const rootTransparency = Math.round(44 - visible * 24);
    const borderTransparency = Math.round(surfaceTransparency * 0.2);
    const ghostTransparency = Math.max(surfaceTransparency + 18, 58);
    // 操作层与内容层透明度差距收敛：避免内容区明显偏深
    // 透明主题下整体偏浅：让详情主区域更接近背景主体的亮度感
    const chromeTransparency = Math.round(clamp(surfaceTransparency + 8, 42, 60));
    const chromeSurfaceTransparency = Math.round(
      clamp(surfaceTransparency + 6, 40, 58),
    );
    const contentTransparency = Math.round(clamp(surfaceTransparency + 4, 38, 56));
    // 透明度滑杆语义：0=最暗(黑遮罩最重)，100=最亮(黑遮罩最轻)
    // 降低暗化上限，透明主题默认更通透
    const dim = clamp(0.74 - visible * 0.64, 0, 0.74);

    root.style.setProperty(
      "--od-bg",
      mixWithTransparency(colors.background, Math.max(rootTransparency, 4)),
    );
    root.style.setProperty(
      "--od-bg-secondary",
      mixWithTransparency(colors.backgroundSecondary, surfaceTransparency),
    );
    root.style.setProperty(
      "--od-bg-tertiary",
      mixWithTransparency(colors.backgroundTertiary, surfaceTransparency),
    );
    root.style.setProperty(
      "--od-card",
      mixWithTransparency(colors.card, surfaceTransparency),
    );
    root.style.setProperty(
      "--od-card-hover",
      mixWithTransparency(colors.cardHover, Math.max(surfaceTransparency - 8, 8)),
    );
    root.style.setProperty(
      "--od-border",
      mixWithTransparency(colors.border, borderTransparency),
    );
    root.style.setProperty(
      "--od-border-strong",
      mixWithTransparency(colors.borderStrong, Math.max(borderTransparency - 3, 4)),
    );
    root.style.setProperty(
      "--od-glass-bg",
      mixWithTransparency(
        colors.backgroundSecondary,
        Math.max(surfaceTransparency - 6, 8),
      ),
    );
    root.style.setProperty(
      "--od-glass-border",
      mixWithTransparency(colors.borderStrong, Math.max(borderTransparency - 4, 3)),
    );
    root.style.setProperty(
      "--od-surface-ghost",
      mixWithTransparency(colors.backgroundSecondary, ghostTransparency),
    );
    root.style.setProperty(
      "--od-surface-ghost-hover",
      mixWithTransparency(
        colors.backgroundSecondary,
        Math.max(ghostTransparency - 12, 28),
      ),
    );
    root.style.setProperty(
      "--od-surface-shell",
      mixWithTransparency(
        colors.backgroundSecondary,
        Math.max(chromeTransparency - 10, 12),
      ),
    );
    root.style.setProperty(
      "--od-surface-content",
      mixWithTransparency(colors.background, Math.max(contentTransparency - 6, 10)),
    );
    root.style.setProperty(
      "--od-surface-raised",
      mixWithTransparency(
        colors.backgroundTertiary,
        Math.max(contentTransparency - 3, 8),
      ),
    );
    root.style.setProperty(
      "--od-surface-floating",
      mixWithTransparency(colors.background, Math.max(contentTransparency - 12, 6)),
    );
    root.style.setProperty(
      "--od-surface-input",
      mixWithTransparency(
        colors.backgroundSecondary,
        Math.max(contentTransparency - 2, 12),
      ),
    );
    root.style.setProperty("--od-surface-soft", mixWithTransparency(colors.accent, 86));
    root.style.setProperty(
      "--od-interactive-hover",
      mixWithTransparency(colors.textPrimary, 92),
    );
    root.style.setProperty(
      "--od-interactive-strong",
      mixWithTransparency(colors.accent, 82),
    );
    root.style.setProperty(
      "--od-shell-line",
      mixWithTransparency(colors.border, Math.max(borderTransparency + 8, 10)),
    );
    root.style.setProperty(
      "--od-divider",
      mixWithTransparency(colors.textSecondary, 72),
    );
    root.style.setProperty(
      "--od-divider-strong",
      mixWithTransparency(colors.textPrimary, 62),
    );
    root.style.setProperty("--od-chrome-transparency", `${chromeTransparency}%`);
    root.style.setProperty(
      "--od-chrome-surface-transparency",
      `${chromeSurfaceTransparency}%`,
    );
    root.style.setProperty("--od-content-transparency", `${contentTransparency}%`);
    root.style.setProperty("--od-wallpaper-dim", String(dim));
  } else {
    root.style.setProperty("--od-bg", colors.background);
    root.style.setProperty("--od-bg-secondary", colors.backgroundSecondary);
    root.style.setProperty("--od-bg-tertiary", colors.backgroundTertiary);
    root.style.setProperty("--od-card", colors.card);
    root.style.setProperty("--od-card-hover", colors.cardHover);
    root.style.setProperty("--od-glass-bg", colors.glassBg);
    root.style.setProperty("--od-glass-border", colors.glassBorder);
    root.style.setProperty("--od-surface-ghost", colors.surfaceGhost);
    root.style.setProperty("--od-surface-ghost-hover", colors.surfaceGhostHover);
    root.style.setProperty(
      "--od-surface-shell",
      `color-mix(in srgb, ${colors.backgroundSecondary} 92%, black 8%)`,
    );
    root.style.setProperty(
      "--od-surface-content",
      `color-mix(in srgb, ${colors.background} 80%, ${colors.backgroundSecondary} 20%)`,
    );
    root.style.setProperty(
      "--od-surface-raised",
      `color-mix(in srgb, ${colors.backgroundTertiary} 76%, ${colors.background} 24%)`,
    );
    root.style.setProperty(
      "--od-surface-floating",
      `color-mix(in srgb, ${colors.background} 88%, black 12%)`,
    );
    root.style.setProperty(
      "--od-surface-input",
      `color-mix(in srgb, ${colors.backgroundSecondary} 74%, transparent 26%)`,
    );
    root.style.setProperty(
      "--od-surface-soft",
      `color-mix(in srgb, ${colors.accent} 8%, transparent 92%)`,
    );
    root.style.setProperty(
      "--od-interactive-hover",
      `color-mix(in srgb, ${colors.textPrimary} 8%, transparent 92%)`,
    );
    root.style.setProperty(
      "--od-interactive-strong",
      `color-mix(in srgb, ${colors.accent} 14%, transparent 86%)`,
    );
    root.style.setProperty(
      "--od-shell-line",
      `color-mix(in srgb, ${colors.border} 76%, transparent)`,
    );
    root.style.setProperty(
      "--od-divider",
      `color-mix(in srgb, ${colors.textSecondary} 28%, transparent)`,
    );
    root.style.setProperty(
      "--od-divider-strong",
      `color-mix(in srgb, ${colors.textPrimary} 38%, transparent)`,
    );
    root.style.setProperty("--od-chrome-transparency", "46%");
    root.style.setProperty("--od-chrome-surface-transparency", "38%");
    root.style.setProperty("--od-content-transparency", "20%");
    root.style.setProperty("--od-wallpaper-dim", "0");
  }

  if (settings.backgroundlessMode) {
    const visible = clamp(settings.backgroundImageOpacity, 0, 1);
    const backgroundlessDim = hasWallpaper
      ? clamp(0.82 - visible * 0.78, 0, 0.82)
      : 0;

    root.style.setProperty("--od-bg", "transparent");
    root.style.setProperty("--od-bg-secondary", "transparent");
    root.style.setProperty("--od-bg-tertiary", "transparent");
    root.style.setProperty("--od-card", "transparent");
    root.style.setProperty("--od-card-hover", "transparent");
    root.style.setProperty("--od-surface-ghost", "transparent");
    root.style.setProperty("--od-surface-ghost-hover", "transparent");
    root.style.setProperty("--od-surface-shell", "transparent");
    root.style.setProperty("--od-surface-content", "transparent");
    root.style.setProperty("--od-surface-raised", "transparent");
    root.style.setProperty("--od-surface-input", "transparent");
    root.style.setProperty("--od-surface-soft", "transparent");
    root.style.setProperty(
      "--od-interactive-hover",
      "color-mix(in srgb, var(--od-text-primary) 10%, transparent 90%)",
    );
    root.style.setProperty(
      "--od-interactive-strong",
      "color-mix(in srgb, var(--od-accent) 12%, transparent 88%)",
    );
    root.style.setProperty(
      "--od-shell-line",
      "color-mix(in srgb, var(--od-border) 42%, transparent)",
    );
    root.style.setProperty(
      "--od-divider",
      "color-mix(in srgb, var(--od-text-secondary) 24%, transparent)",
    );
    root.style.setProperty(
      "--od-divider-strong",
      "color-mix(in srgb, var(--od-text-primary) 30%, transparent)",
    );
    root.style.setProperty("--od-wallpaper-dim", String(backgroundlessDim));
  }

  return { hasWallpaper, glassEnabled };
}
