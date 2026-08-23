import {
  Globe2,
  Grid,
  Image as ImageIcon,
  ImageOff,
  List,
  Maximize2,
  Minimize2,
  Monitor,
  Scan,
  ScrollText,
  Smartphone,
  Type,
} from 'lucide-react';

import previewBackground from '@/assets/images/background/garden.png';
import { ThreadCard } from '@/features/threads/components/ThreadCard';
import type { Thread } from '@/entities/thread/types';
import { useEasterEggUnlocks } from '@/features/easter-eggs/hooks/useEasterEggUnlocks';
import { useTheme } from '@/shared/hooks/useTheme';
import type { UserSettings } from '@/shared/lib/settings';
import { themes } from '@/shared/styles/themes';

import { dangerPinkThemeOption, themeOptions } from './config';
import { SettingsPageSection } from './SettingsPageSection';
import { SettingsToggle } from './SettingsToggle';

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
    <SettingsPageSection title="显示与阅读" showTopBorder={false}>
      <div className="space-y-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <div className="space-y-8" data-tour="layout-image-settings">
            <div>
              <h3 className="text-lg font-semibold text-(--od-text-primary)">阅读尺寸</h3>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold text-(--od-text-tertiary)">字号</p>
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">PC 每行数量</p>
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
                          <span className="od-choice-title text-sm">{size === 'compact' ? '5 张' : size === 'normal' ? '4 张' : '3 张'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-(--od-text-primary)">文字与图片</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => updateSettings({ fontMode: 'system' })} data-active={settings.fontMode === 'system'} className={rowChoiceClass}>
                  <Monitor className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">系统字体</p>
                  </div>
                </button>
                <button type="button" onClick={() => updateSettings({ fontMode: 'theme' })} data-active={settings.fontMode === 'theme'} className={rowChoiceClass}>
                  <Type className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">主题字体</p>
                  </div>
                </button>
                <button type="button" onClick={() => updateSettings({ imageMode: 'normal' })} data-active={settings.imageMode === 'normal'} className={rowChoiceClass}>
                  <ImageIcon className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                  <div className="min-w-0">
                    <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">显示图片</p>
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
            <p className="mb-3 text-xs font-semibold text-(--od-text-tertiary)">效果预览</p>
            <div className="pointer-events-none mx-auto max-w-[16rem]" aria-hidden="true">
              <ThreadCard thread={previewThread} />
            </div>
          </aside>
        </div>

        <div className="border-t border-(--od-shell-line) pt-8">
          <h3 className="text-lg font-semibold text-(--od-text-primary)">布局与浏览</h3>
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-(--od-text-tertiary)">默认布局</p>
              <button type="button" onClick={() => updateSettings({ layoutMode: 'grid' })} data-active={settings.layoutMode === 'grid'} className={`${rowChoiceClass} w-full`}>
                <Grid className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">网格布局</p></div>
              </button>
              <button type="button" onClick={() => updateSettings({ layoutMode: 'list' })} data-active={settings.layoutMode === 'list'} className={`${rowChoiceClass} w-full`}>
                <List className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">列表布局</p></div>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-(--od-text-tertiary)">加载方式</p>
              <button type="button" onClick={() => updateSettings({ resultPagingMode: 'pagination' })} data-active={settings.resultPagingMode === 'pagination'} className={`${rowChoiceClass} w-full`}>
                <List className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">分页浏览</p></div>
              </button>
              <button type="button" onClick={() => updateSettings({ resultPagingMode: 'infinite' })} data-active={settings.resultPagingMode === 'infinite'} className={`${rowChoiceClass} w-full`}>
                <ScrollText className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">连续滚动</p></div>
              </button>
              <div className="od-setting-row">
                <div>
                  <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">无缝浏览缓冲</p>
                  <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">始终保持固定页数的浏览缓冲，图片仍按进入视口懒加载。</p>
                </div>
                <SettingsToggle
                  checked={settings.resultPreloadEnabled}
                  onToggle={() => updateSettings({ resultPreloadEnabled: !settings.resultPreloadEnabled })}
                  ariaLabel="切换无缝浏览缓冲"
                />
              </div>
              <div className={settings.resultPreloadEnabled ? '' : 'opacity-45'}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-tertiary)">保持加载缓冲</p>
                <div className="od-options-wrap">
                  {([2, 3, 4] as const).map((pages) => (
                    <button
                      key={pages}
                      type="button"
                      disabled={!settings.resultPreloadEnabled}
                      onClick={() => updateSettings({ resultPreloadPages: pages })}
                      data-active={settings.resultPreloadPages === pages}
                      className="od-option-inline min-w-20 justify-center"
                    >
                      <span className="od-choice-title text-sm">{pages} 页</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-(--od-text-tertiary)">打开方式</p>
              <button type="button" onClick={() => updateSettings({ openMode: 'web' })} data-active={settings.openMode === 'web'} className={`${rowChoiceClass} w-full`}>
                <Globe2 className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">网页端打开</p></div>
              </button>
              <button type="button" onClick={() => updateSettings({ openMode: 'app' })} data-active={settings.openMode === 'app'} className={`${rowChoiceClass} w-full`}>
                <Smartphone className="od-choice-icon h-5 w-5 text-(--od-text-secondary)" />
                <div><p className="od-choice-title text-sm font-medium text-(--od-text-primary)">Discord 客户端</p></div>
              </button>
              <p className="text-xs leading-relaxed text-(--od-text-tertiary)">
                提示：DeepLink 协议主要用于已安装客户端的桌面端环境；移动端或未安装客户端时，网页端/HTTP 链接通常具备更好的兼容性与唤起体验。若客户端唤起无响应，系统将自动引导降级至 Web 端。
              </p>
            </div>
          </div>
        </div>

        <div id="appearance-settings" className="scroll-mt-6 border-t border-(--od-shell-line) pt-8">
          <h3 className="text-lg font-semibold text-(--od-text-primary)">主题</h3>
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
                    <div className="min-w-0">
                      <p className="od-choice-title text-sm font-medium text-(--od-text-primary)">{option.label}</p>
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
