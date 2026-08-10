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
    | 'twitter'
    | null;
};

export const themeOptions: ThemeOption[] = [
  {
    id: 'discord-dark',
    label: 'Discord 深色',
    themeKey: 'discordDark',
  },
  {
    id: 'discord-light',
    label: 'Discord 浅色',
    themeKey: 'discordLight',
  },
  {
    id: 'claude-dark',
    label: 'Claude 深色',
    themeKey: 'claudeDark',
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    themeKey: 'catppuccin',
  },
  {
    id: 'nord',
    label: 'Nord',
    themeKey: 'nord',
  },
  {
    id: 'everforest',
    label: 'Everforest',
    themeKey: 'everforest',
  },
  {
    id: 'yozakura-night',
    label: 'Yozakura Night',
    themeKey: 'yozakuraNight',
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    themeKey: 'tokyoNight',
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    themeKey: 'twitter',
  },
  {
    id: 'auto',
    label: '跟随系统',
    themeKey: null,
  },
];

export const dangerPinkThemeOption: ThemeOption = {
  id: 'danger-pink-red',
  label: '红粉警戒',
  themeKey: 'dangerPinkRed',
};

export const backgroundPresets = [
  {
    id: 'fantasy-market',
    label: '西幻集市',
    previewUrl: fantasyMarketBackground,
  },
  {
    id: 'balcony-garden',
    label: '阳台花园',
    previewUrl: gardenBackground,
  },
  {
    id: 'railway',
    label: '电车',
    previewUrl: railwayBackground,
  },
  {
    id: 'rainy-room',
    label: '雨天室内',
    previewUrl: rainyDayBackground,
  },
  {
    id: 'school-rooftop',
    label: '学校天台',
    previewUrl: rooftopBackground,
  },
  {
    id: 'earth-from-space',
    label: '太空远望',
    previewUrl: spaceBackground,
  },
  {
    id: 'vending-machine',
    label: '自动贩卖机旁',
    previewUrl: vendingMachineBackground,
  },
] as const;
