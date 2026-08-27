// 设置相关的类型定义和存储管理

export interface UserSettings {
  fontSize: 'small' | 'medium' | 'large';
  fontMode: 'system' | 'theme';
  cardSize: 'compact' | 'normal' | 'large';
  layoutMode: 'grid' | 'list';
  resultPagingMode: 'pagination' | 'infinite';
  resultPreloadEnabled: boolean;
  resultPreloadPages: 2 | 3 | 4;
  compactMode: boolean;
  /**
   * 图片加载策略：
   * - normal：正常加载所有图片
   * - off：尽量不加载非必要图片（帖子缩略图等）
   */
  imageMode: 'normal' | 'off';
  // 主题选择：多套具体主题 + 自动
  theme:
  | 'discord-dark'
  | 'discord-light'
  | 'claude-dark'
  | 'tokyo-night'
  | 'catppuccin'
  | 'nord'
  | 'everforest'
  | 'sakura-day'
  | 'yozakura-night'
  | 'twitter'
  | 'danger-pink-red'
  | 'auto';
  glassMode: 'off' | 'on' | 'auto';
  glassBlur: number;
  backgroundlessMode: boolean;
  backgroundImageEnabled: boolean;
  backgroundImageUrl: string;
  backgroundImageBase64: string;
  backgroundImageOpacity: number;
  sidebarCollapsed: boolean;
  notifications: {
    newPosts: boolean;
    replies: boolean;
    mentions: boolean;
  };
  openMode: 'app' | 'web';
}

const SETTINGS_KEY = 'odysseia_user_settings';

// 默认设置
const defaultSettings: UserSettings = {
  fontSize: 'medium',
  fontMode: 'system',
  cardSize: 'normal',
  layoutMode: 'grid',
  resultPagingMode: 'infinite',
  resultPreloadEnabled: false,
  resultPreloadPages: 3,
  compactMode: false,
  imageMode: 'normal',
  theme: 'discord-dark',
  glassMode: 'off',
  glassBlur: 16,
  backgroundlessMode: false,
  backgroundImageEnabled: false,
  backgroundImageUrl: '',
  backgroundImageBase64: '',
  backgroundImageOpacity: 0.68,
  sidebarCollapsed: false,
  notifications: {
    newPosts: true,
    replies: true,
    mentions: true,
  },
  openMode: 'web',
};

// 获取用户设置
export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserSettings> & {
        theme?: string;
      };

      // 兼容旧的 theme 值（使用字符串中间变量避免 TS 报错）
      const rawTheme = parsed.theme as string | undefined;
      if (rawTheme === 'dark') {
        parsed.theme = 'discord-dark';
      } else if (rawTheme === 'light') {
        parsed.theme = 'discord-light';
      } else if (rawTheme === 'paper-dark' || rawTheme === 'paper-light') {
        parsed.theme = 'claude-dark';
      } else if (rawTheme === 'tweak-gray-dark' || rawTheme === 'tweak-gray-light') {
        parsed.theme = 'nord';
      }

      if (typeof parsed.backgroundImageOpacity === 'number') {
        parsed.backgroundImageOpacity = Math.max(0, Math.min(1, parsed.backgroundImageOpacity));
      }

      if (typeof parsed.glassBlur === 'number') {
        parsed.glassBlur = Math.max(0, Math.min(32, parsed.glassBlur));
      }

      if (![2, 3, 4].includes(Number(parsed.resultPreloadPages))) {
        parsed.resultPreloadPages = 3;
      }

      // 合并默认设置，确保新增的设置项有默认值
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load user settings:', error);
  }
  return defaultSettings;
}

// 保存用户设置
export function saveUserSettings(settings: UserSettings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save user settings:', error);
    return false;
  }
}

// 重置设置
export function resetUserSettings(): boolean {
  return saveUserSettings(defaultSettings);
}

// 字体大小映射（拉大差异，让设置切换有明显体感）
export const fontSizeMap = {
  small: {
    // 更紧凑
    title: 'text-sm', // 14px
    content: 'text-xs', // 12px
    meta: 'text-[10px]', // ~10px
  },
  medium: {
    // 默认
    title: 'text-lg', // 18px
    content: 'text-sm', // 14px
    meta: 'text-xs', // 12px
  },
  large: {
    // 明显放大
    title: 'text-2xl', // 24px
    content: 'text-lg', // 18px
    meta: 'text-base', // 16px
  },
};
