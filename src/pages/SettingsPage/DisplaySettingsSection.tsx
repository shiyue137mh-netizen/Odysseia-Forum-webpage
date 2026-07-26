import {
  Globe2,
  Grid,
  Image as ImageIcon,
  ImageOff,
  Layout,
  List,
  Maximize2,
  Minimize2,
  Monitor,
  Scan,
  ScrollText,
  Smartphone,
  Type,
} from 'lucide-react';

import previewBackground from '@/assets/images/background/summer2.png';
import { ThreadCard } from '@/entities/thread/ThreadCard';
import type { Thread } from '@/entities/thread/types';
import { useEasterEggUnlocks } from '@/features/easter-eggs/hooks/useEasterEggUnlocks';
import { useTheme } from '@/shared/hooks/useTheme';
import type { UserSettings } from '@/shared/lib/settings';
import { themes } from '@/shared/styles/themes';

import { dangerPinkThemeOption, themeOptions } from './config';
import { SettingsPageSection } from './SettingsPageSection';

type DisplaySettingsSectionProps = {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
};

const rowChoiceClass = 'od-setting-choice flex min-w-0 items-center gap-3 p-4 text-left';

export function DisplaySettingsSection({ settings, updateSettings }: DisplaySettingsSectionProps) {
  const { setThemeWithTransition } = useTheme();
  const { dangerPinkThemeUnlocked } = useEasterEggUnlocks();
  const visibleThemeOptions = dangerPinkThemeUnlocked
    ? [...themeOptions, dangerPinkThemeOption]
    : themeOptions;
  const previewThread = {
    thread_id: 'settings-preview',
    guild_id: 'settings-preview',
    channel_id: 'settings-preview',
    title: '夏夜里的一次角色卡漫游',
    author: {
      id: '',
      name: 'odysseia',
      global_name: '类脑娘',
      display_name: '类脑娘',
      avatar_url: previewBackground,
    },
    created_at: '2026-07-26T12:00:00Z',
    last_active_at: '2026-07-26T12:08:00Z',
    reaction_count: 128,
    reply_count: 24,
    collection_count: 12,
    display_count: 520,
    first_message_excerpt: '烟火、晚风和一张刚刚完成的角色卡。这里会直接复用搜索页的真实卡片样式。',
    thumbnail_urls: settings.imageMode === 'normal' ? [previewBackground] : [],
    tags: ['角色卡', '夏日', '原创'],
    virtual_tags: [],
    collected_flag: false,
    is_tournament: false,
  } as Thread;

  return (
    <SettingsPageSection kicker="Visual Hierarchy" title="显示与阅读" icon={Layout}>
      <div className="space-y-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <div className="space-y-8" data-tour="layout-image-settings">
            <div>
              <h3 className="text-lg font-semibold text-(--od-text-primary)">阅读尺寸</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
                字号和卡片密度会共同影响内容流的阅读节奏。
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">Font Size</p>
                  <div className="od-options-wrap">
                    {(['small', 'medium', 'large'] as const).map((size) => {
                      const isActive = settings.fontSize === size;
                      const sampleSizeClass = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-lg';
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateSettings({ fontSize: size })}
                          data-active={isActive}
                          className="od-option-inline min-w-20 justify-center"
                        >
                          <span className={`od-choice-value font-semibold leading-none ${sampleSizeClass}`}>Aa</span>
                          <span className="od-choice-title text-sm">{size === 'small' ? '小' : size === 'medium' ? '中' : '大'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">Card Density</p>
                  <div className="od-options-wrap">
                    {(['compact', 'normal', 'large'] as const).map((size) => {
                      const Icon = size === 'compact' ? Minimize2 : size === 'normal' ? Scan : Maximize2;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateSettings({ cardSize: size })}
                          data-active={settings.cardSize === size}
                          className="od-option-inline min-w-24 justify-center"
                        >
                          <Icon className="od-choice-icon h-4 w-4" />
                          <span className="od-choice-title text-sm">{size === 'compact' ? '紧凑' : size === 'normal' ? '标准' : '宽松'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-(--od-text-primary)">文字与图片</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
                选择字体来源，并决定内容卡片是否加载缩略图。
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => updateSettings({ fontMode: 'system' })} data-active={settings.fontMode === 'system'} className={rowChoiceClass}>
                  <Monitor className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">系统字体</p>
                    <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">最快、最稳，沿用设备阅读习惯</p>
                  </div>
                </button>
                <button type="button" onClick={() => updateSettings({ fontMode: 'theme' })} data-active={settings.fontMode === 'theme'} className={rowChoiceClass}>
                  <Type className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">主题字体</p>
                    <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">跟随主题切换字形与气质</p>
                  </div>
                </button>
                <button type="button" onClick={() => updateSettings({ imageMode: 'normal' })} data-active={settings.imageMode === 'normal'} className={rowChoiceClass}>
                  <ImageIcon className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">显示图片</p>
                    <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">保留封面和缩略图的氛围感</p>
                  </div>
                </button>
                <button type="button" onClick={() => updateSettings({ imageMode: 'off' })} data-active={settings.imageMode === 'off'} className={rowChoiceClass}>
                  <ImageOff className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">关闭图片</p>
                    <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">专注文字，同时减少流量消耗</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <aside className="xl:sticky xl:top-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">Live Preview</p>
            <div className="pointer-events-none mx-auto max-w-[16rem]" aria-hidden="true">
              <ThreadCard thread={previewThread} hideBottomDivider />
            </div>
          </aside>
        </div>

        <div className="border-t border-(--od-shell-line) pt-8">
          <h3 className="text-lg font-semibold text-(--od-text-primary)">布局与浏览</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
            控制默认内容布局、结果加载方式和 Discord 链接打开位置。
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">Layout</p>
              <button type="button" onClick={() => updateSettings({ layoutMode: 'grid' })} data-active={settings.layoutMode === 'grid'} className={`${rowChoiceClass} w-full`}>
                <Grid className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">网格布局</p><p className="mt-1 text-xs text-(--od-text-tertiary)">适合封面与视觉浏览</p></div>
              </button>
              <button type="button" onClick={() => updateSettings({ layoutMode: 'list' })} data-active={settings.layoutMode === 'list'} className={`${rowChoiceClass} w-full`}>
                <List className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">列表布局</p><p className="mt-1 text-xs text-(--od-text-tertiary)">适合筛选与连续阅读</p></div>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">Result Loading</p>
              <button type="button" onClick={() => updateSettings({ resultPagingMode: 'pagination' })} data-active={settings.resultPagingMode === 'pagination'} className={`${rowChoiceClass} w-full`}>
                <List className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">分页浏览</p><p className="mt-1 text-xs text-(--od-text-tertiary)">保留页码，便于回看</p></div>
              </button>
              <button type="button" onClick={() => updateSettings({ resultPagingMode: 'infinite' })} data-active={settings.resultPagingMode === 'infinite'} className={`${rowChoiceClass} w-full`}>
                <ScrollText className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">连续滚动</p><p className="mt-1 text-xs text-(--od-text-tertiary)">到底后自动加载更多</p></div>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">Discord Link</p>
              <button type="button" onClick={() => updateSettings({ openMode: 'web' })} data-active={settings.openMode === 'web'} className={`${rowChoiceClass} w-full`}>
                <Globe2 className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">网页端打开</p><p className="mt-1 text-xs text-(--od-text-tertiary)">兼容性最好</p></div>
              </button>
              <button type="button" onClick={() => updateSettings({ openMode: 'app' })} data-active={settings.openMode === 'app'} className={`${rowChoiceClass} w-full`}>
                <Smartphone className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">Discord App</p><p className="mt-1 text-xs text-(--od-text-tertiary)">尝试唤起已安装客户端</p></div>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-(--od-shell-line) pt-8">
          <h3 className="text-lg font-semibold text-(--od-text-primary)">主题</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
            每张卡片都展示该主题的背景、内容层和强调色组合。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleThemeOptions.map((option) => {
              const isSelected = settings.theme === option.id;
              const themeColors = option.themeKey ? themes[option.themeKey].colors : null;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={(event) => setThemeWithTransition(option.id, 'circle', event)}
                  data-active={isSelected}
                  className="od-setting-choice min-w-0 overflow-hidden p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                    <option.icon className="od-choice-icon mt-0.5 h-4 w-4 shrink-0 text-(--od-text-secondary)" />
                    <div className="min-w-0">
                      <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">{option.description}</p>
                    </div>
                    </div>
                    <div className="flex shrink-0 -space-x-2 pt-0.5" aria-hidden="true">
                      <span className="h-7 w-7 rounded-full" style={{ background: themeColors?.background || 'var(--od-bg)' }} />
                      <span className="h-7 w-7 rounded-full" style={{ background: themeColors?.card || 'var(--od-card)' }} />
                      <span className="h-7 w-7 rounded-full" style={{ background: themeColors?.accent || 'var(--od-accent)' }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SettingsPageSection>
  );
}
