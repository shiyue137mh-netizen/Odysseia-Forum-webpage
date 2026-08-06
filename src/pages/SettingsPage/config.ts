import {
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';

import type { UserSettings } from '@/shared/lib/settings';
import fantasyMarketBackground from '@/assets/images/background/apple.png';
import gardenBackground from '@/assets/images/background/garden.png';
import railwayBackground from '@/assets/images/background/railways.png';
import rainyDayBackground from '@/assets/images/background/rainyday.png';
import rooftopBackground from '@/assets/images/background/roof.png';
import spaceBackground from '@/assets/images/background/space.png';
import vendingMachineBackground from '@/assets/images/background/vending_machine.png';

type ThemeOption = {
  id: UserSettings['theme'];
  label: string;
  icon: LucideIcon;
  themeKey:
    | 'discordDark'
    | 'discordLight'
    | 'claudeDark'
    | 'catppuccin'
    | 'nord'
    | 'everforest'
    | 'sakuraDay'
    | 'yozakuraNight'
    | 'dangerPinkRed'
    | 'tokyoNight'
    | null;
  description: string;
};

export const themeOptions: ThemeOption[] = [
  {
    id: 'discord-dark',
    label: 'Discord 深色',
    icon: Moon,
    themeKey: 'discordDark',
    description: '经典 Discord 暗色风格',
  },
  {
    id: 'discord-light',
    label: 'Discord 浅色',
    icon: Sun,
    themeKey: 'discordLight',
    description: '明亮的浅色主题',
  },
  {
    id: 'claude-dark',
    label: 'Claude 深色',
    icon: Moon,
    themeKey: 'claudeDark',
    description: '保留的经典深色主题',
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    icon: Moon,
    themeKey: 'catppuccin',
    description: '柔和高对比的社区经典',
  },
  {
    id: 'nord',
    label: 'Nord',
    icon: Moon,
    themeKey: 'nord',
    description: '冷调清晰的信息密度风格',
  },
  {
    id: 'everforest',
    label: 'Everforest',
    icon: Moon,
    themeKey: 'everforest',
    description: '护眼森林调，适合长时阅读',
  },
  {
    id: 'yozakura-night',
    label: 'Yozakura Night',
    icon: Moon,
    themeKey: 'yozakuraNight',
    description: '夜樱霓光，冷调紫与冰蓝',
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    icon: Moon,
    themeKey: 'tokyoNight',
    description: '代码高亮感最强的夜色主题',
  },
  {
    id: 'auto',
    label: '跟随系统',
    icon: Monitor,
    themeKey: null,
    description: '根据系统深浅色自动切换',
  },
];

export const dangerPinkThemeOption: ThemeOption = {
  id: 'danger-pink-red',
  label: '红粉警戒',
  icon: Moon,
  themeKey: 'dangerPinkRed',
  description: '高危双色视觉实验',
};

export const backgroundPresets = [
  {
    id: 'fantasy-market',
    label: '西幻集市',
    description: '热闹而温暖的异世界街市',
    previewUrl: fantasyMarketBackground,
  },
  {
    id: 'balcony-garden',
    label: '阳台花园',
    description: '安静明亮的城市绿意',
    previewUrl: gardenBackground,
  },
  {
    id: 'railway',
    label: '电车',
    description: '沿着轨道驶入远方',
    previewUrl: railwayBackground,
  },
  {
    id: 'rainy-room',
    label: '雨天室内',
    description: '隔着窗听一场安静的雨',
    previewUrl: rainyDayBackground,
  },
  {
    id: 'school-rooftop',
    label: '学校天台',
    description: '风吹过放学后的天台',
    previewUrl: rooftopBackground,
  },
  {
    id: 'earth-from-space',
    label: '太空远望',
    description: '从星海之间回望地球',
    previewUrl: spaceBackground,
  },
  {
    id: 'vending-machine',
    label: '自动贩卖机旁',
    description: '靠着自动贩卖机稍作停留',
    previewUrl: vendingMachineBackground,
  },
] as const;
