import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Globe2, List, LogOut, ScrollText, Smartphone } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { authApi } from '@/features/auth/api/authApi';
import { useOnboardingStore } from '@/features/onboarding/store/useOnboardingStore';
import { useUserPreferences } from '@/features/preferences/hooks/useUserPreferences';
import { GUILD_ID } from '@/shared/config/channelCategories.private';
import { useChannels } from '@/shared/hooks/useChannels';
import { useSettings } from '@/shared/hooks/useSettings';
import { extractErrorMessage } from '@/shared/lib/notify';
import { sanitizeInternalRedirect } from '@/shared/lib/navigationSafety';
import { OmicronLoader } from '@/shared/ui/loaders/OmicronLoader';
import { AuthSceneBackground } from './AuthSceneBackground';

type OpenMode = 'web' | 'app';
type PagingMode = 'pagination' | 'infinite';

export function isSetupPreviewEnabled(search: string, isDev: boolean) {
  return isDev && new URLSearchParams(search).get('preview') === '1';
}

const steps = [
  { title: '排除不想看的频道', description: '默认保留全部频道，只需要点选少数不希望进入发现、Banner 和推荐的频道。' },
  { title: '排除不想看的内容', description: '选择不希望出现在发现结果里的 Tag；没有需要排除的也可以直接继续。' },
  { title: '选择 Discord 跳转方式', description: '这个选择会决定帖子链接以后打开网页端还是 Discord App。' },
  { title: '选择内容加载方式', description: '决定搜索、书单和赛事列表使用分页还是连续滚动，也可以开启无缝浏览缓冲。' },
  { title: '确认并进入社区', description: '保存后才会进入主页，这些设置之后仍然可以在偏好与设置页修改。' },
] as const;

function SelectionIndicator({ selected, tone = 'accent' }: { selected: boolean; tone?: 'accent' | 'danger' }) {
  const activeClass = tone === 'danger'
    ? 'border-rose-400 bg-rose-400 text-rose-950'
    : 'border-emerald-400 bg-emerald-400 text-emerald-950';

  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${selected ? activeClass : 'border-(--od-text-tertiary)'}`}
      aria-hidden="true"
    >
      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

export function RequiredSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = isSetupPreviewEnabled(location.search, import.meta.env.DEV);
  const legacySetupCompleted = useOnboardingStore((state) =>
    state.completedTutorialIds.includes('initial_setup'),
  );
  const { updateSettings } = useSettings();
  const preferencesQuery = useUserPreferences({ guildId: GUILD_ID });
  const channelsQuery = useChannels();
  const tagCatalog = useMemo(
    () => channelsQuery.data?.tagCatalog || [],
    [channelsQuery.data?.tagCatalog],
  );
  const tagsLoading = channelsQuery.isLoading;
  const [stepIndex, setStepIndex] = useState(0);
  const [excludedChannelIds, setExcludedChannelIds] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [openMode, setOpenMode] = useState<OpenMode | null>(null);
  const [pagingMode, setPagingMode] = useState<PagingMode | null>(null);
  const [preloadEnabled, setPreloadEnabled] = useState(false);
  const [preloadPages, setPreloadPages] = useState<2 | 3 | 4>(3);
  const [configureAppearance, setConfigureAppearance] = useState(false);
  const [saveError, setSaveError] = useState('');

  const channelOptions = channelsQuery.data?.channels || [];
  const selectedChannelIds = useMemo(
    () => channelOptions
      .filter((channel) => !excludedChannelIds.includes(channel.id))
      .map((channel) => channel.id),
    [channelOptions, excludedChannelIds],
  );

  const availableTagGroups = useMemo(() => {
    const selected = new Set(selectedChannelIds);
    return tagCatalog
      .filter((channel) => selected.has(channel.channel_id))
      .map((channel) => ({
        channelId: channel.channel_id,
        channelName: channel.channel_name,
        tags: Array.from(new Set([
          ...(channel.available_tags || []),
          ...(channel.virtual_tags || []),
        ])).filter(Boolean),
        virtualTags: new Set(channel.virtual_tags || []),
      }))
      .filter((channel) => channel.tags.length > 0);
  }, [selectedChannelIds, tagCatalog]);

  if (!isPreview && preferencesQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-(--od-bg)"><OmicronLoader /></div>;
  }

  if (!isPreview && preferencesQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--od-bg) px-4 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-sm leading-6 text-(--od-text-secondary)">
            暂时无法确认账号配置状态。请先重新连接，避免把已有账号误判成新用户。
          </p>
          <button type="button" onClick={() => void preferencesQuery.refetch()} className="od-button-primary rounded-xl px-5 py-2 text-sm">
            重新检查
          </button>
        </div>
      </div>
    );
  }

  if (!isPreview && (!preferencesQuery.isFirstTime || legacySetupCompleted)) {
    return <Navigate to="/" replace />;
  }

  const returnTo = sanitizeInternalRedirect(
    (location.state as { returnTo?: string } | null)?.returnTo,
  );
  const canContinue = stepIndex === 0
    ? channelsQuery.data?.source === 'api' && selectedChannelIds.length > 0
    : stepIndex === 2
      ? openMode !== null
      : stepIndex === 3
        ? pagingMode !== null
      : true;

  const save = async () => {
    if (!openMode) return;
    if (!pagingMode) return;
    const destination = configureAppearance ? '/settings#appearance-settings' : returnTo === '/setup' ? '/' : returnTo;
    if (isPreview) {
      navigate(destination, { replace: true });
      return;
    }
    setSaveError('');
    try {
      await preferencesQuery.savePreferences({
        preferred_channels: selectedChannelIds,
        include_authors: [],
        exclude_authors: [],
        include_tags: [],
        exclude_tags: excludedTags,
        include_keywords: '',
        exclude_keywords: '',
        preview_image_mode: 'thumbnail',
        results_per_page: 5,
        ui_page_size: 48,
        sort_method: 'last_active',
      });
      updateSettings({
        openMode,
        resultPagingMode: pagingMode,
        resultPreloadEnabled: preloadEnabled,
        resultPreloadPages: preloadPages,
      });
      navigate(destination, { replace: true });
    } catch (error) {
      setSaveError(extractErrorMessage(error, '配置暂时没有保存成功，请重试。'));
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6">
      <AuthSceneBackground />
      <div className="absolute inset-0 bg-black/48 backdrop-blur-[2px]" />

      <section className="relative z-10 flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[color-mix(in_oklab,var(--od-bg-tertiary)_88%,transparent)] shadow-2xl backdrop-blur-xl">
        <header className="shrink-0 px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-(--od-accent)">
                {isPreview ? '本地预览' : '首次配置'}
              </p>
              <h1 className="mt-2 text-xl font-bold text-(--od-text-primary) sm:text-2xl">{steps[stepIndex].title}</h1>
            </div>
            <span className="shrink-0 text-xs text-(--od-text-tertiary)">{stepIndex + 1} / {steps.length}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-(--od-text-secondary)">{steps[stepIndex].description}</p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {steps.map((step, index) => (
              <span key={step.title} className={`h-1 flex-1 rounded-full ${index <= stepIndex ? 'bg-(--od-accent)' : 'bg-white/10'}`} />
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto border-y border-white/8 px-5 py-5 sm:px-8 sm:py-6">
          {stepIndex === 0 && (
            <div className="space-y-4">
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 text-sm text-(--od-text-tertiary)">
                <span>已排除 {excludedChannelIds.length} 个，保留 {selectedChannelIds.length} 个</span>
                {excludedChannelIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExcludedChannelIds([])}
                  className="od-inline-action od-inline-action-ghost"
                >
                  清除排除
                </button>
                )}
              </div>
              {channelsQuery.isLoading ? (
                <p className="text-sm text-(--od-text-secondary)">正在读取频道…</p>
              ) : channelsQuery.data?.source !== 'api' ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-(--od-error)">
                    暂时无法读取真实频道列表。首次配置不会使用本地备用频道，避免保存失效的频道 ID。
                  </p>
                  <button type="button" onClick={() => void channelsQuery.refetch()} className="od-inline-action od-inline-action-soft">
                    重新读取
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {channelOptions.map((channel) => {
                    const excluded = excludedChannelIds.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        aria-pressed={excluded}
                        onClick={() => setExcludedChannelIds((current) => excluded
                          ? current.filter((id) => id !== channel.id)
                          : [...current, channel.id])}
                        className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-left text-sm transition-colors ${excluded ? 'bg-rose-500/12 text-rose-300' : 'text-(--od-text-secondary) hover:bg-white/4 hover:text-(--od-text-primary)'}`}
                      >
                        <span>{excluded ? '排除 · ' : ''}{channel.name}</span>
                        <SelectionIndicator selected={excluded} tone="danger" />
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedChannelIds.length === 0 && (
                <p className="text-sm text-(--od-error)">至少保留一个频道，避免进入主页后没有任何可发现内容。</p>
              )}
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-6">
              {tagsLoading ? (
                <p className="text-sm text-(--od-text-secondary)">正在读取 Tag…</p>
              ) : availableTagGroups.length === 0 ? (
                <p className="text-sm text-(--od-text-secondary)">当前频道范围内没有可配置的 Tag，可以直接继续。</p>
              ) : availableTagGroups.map((group) => (
                <section key={group.channelId}>
                  <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="text-sm font-semibold text-(--od-text-primary)">{group.channelName}</h2>
                    <span className="text-xs text-(--od-text-tertiary)">{group.tags.length} 个 Tag</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
                      const excluded = excludedTags.includes(tag);
                      return (
                        <button
                          key={`${group.channelId}-${tag}`}
                          type="button"
                          aria-pressed={excluded}
                          onClick={() => setExcludedTags((current) => excluded
                            ? current.filter((item) => item !== tag)
                            : [...current, tag])}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${excluded ? 'bg-rose-500/16 text-rose-300' : 'text-(--od-text-secondary) hover:bg-white/4 hover:text-(--od-text-primary)'}`}
                        >
                          <SelectionIndicator selected={excluded} tone="danger" />
                          {excluded ? '排除 · ' : ''}{tag}
                          {group.virtualTags.has(tag) && <span className="ml-1.5 text-[10px] text-(--od-accent)">虚拟</span>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { value: 'web' as const, label: '网页端', description: '在浏览器中打开 Discord 帖子，兼容性更稳定。', icon: Globe2 },
                  { value: 'app' as const, label: 'Discord App', description: '优先唤起本机 Discord 客户端。', icon: Smartphone },
                ]).map((option) => {
                  const Icon = option.icon;
                  const selected = openMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setOpenMode(option.value)}
                      className={`h-full rounded-xl p-4 text-left transition-colors ${selected ? 'bg-emerald-500/12 text-(--od-text-primary)' : 'text-(--od-text-secondary) hover:bg-white/4'}`}
                    >
                      <div className="flex min-h-6 items-center gap-3">
                        <Icon className={`h-5 w-5 ${selected ? 'text-emerald-300' : ''}`} />
                        <span className="font-semibold">{option.label}</span>
                        <span className="ml-auto"><SelectionIndicator selected={selected} /></span>
                      </div>
                      <p className="mt-3 min-h-12 text-sm leading-6 text-(--od-text-tertiary)">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="px-1 text-xs leading-relaxed text-(--od-text-tertiary)">
                提示：DeepLink 协议主要用于已安装客户端的桌面端环境；移动端或未安装客户端时，网页端/HTTP 链接通常具备更好的兼容性与唤起体验。若客户端唤起无响应，系统将自动引导降级至 Web 端。
              </p>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { value: 'pagination' as const, label: '分页浏览', icon: List },
                  { value: 'infinite' as const, label: '连续滚动', icon: ScrollText },
                ]).map((option) => {
                  const Icon = option.icon;
                  const selected = pagingMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPagingMode(option.value)}
                      className={`flex min-h-14 items-center gap-3 rounded-xl p-4 text-left transition-colors ${selected ? 'bg-emerald-500/12 text-(--od-text-primary)' : 'text-(--od-text-secondary) hover:bg-white/4'}`}
                    >
                      <Icon className={`h-5 w-5 ${selected ? 'text-emerald-300' : ''}`} />
                      <span className="font-semibold">{option.label}</span>
                      <span className="ml-auto"><SelectionIndicator selected={selected} /></span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setPreloadEnabled((enabled) => !enabled)}
                  className="flex w-full items-center justify-between gap-4 py-2 text-left"
                >
                  <div>
                    <p className="font-medium text-(--od-text-primary)">无缝浏览缓冲</p>
                    <p className="mt-1 text-sm leading-6 text-(--od-text-tertiary)">提前保持后续页面可用，图片仍在进入视口时加载。</p>
                  </div>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${preloadEnabled ? 'bg-(--od-accent)' : 'bg-white/12'}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${preloadEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </button>

                <div className={preloadEnabled ? '' : 'pointer-events-none opacity-40'}>
                  <p className="mb-2 text-xs font-semibold text-(--od-text-tertiary)">保持加载缓冲</p>
                  <div className="flex gap-3">
                    {([2, 3, 4] as const).map((pages) => (
                      <button
                        key={pages}
                        type="button"
                        aria-pressed={preloadPages === pages}
                        onClick={() => setPreloadPages(pages)}
                        className={`inline-flex min-h-10 min-w-20 items-center justify-center gap-2 rounded-xl px-4 text-sm transition-colors ${preloadPages === pages ? 'bg-emerald-500/12 text-emerald-300' : 'text-(--od-text-secondary) hover:bg-white/4 hover:text-(--od-text-primary)'}`}
                      >
                        <SelectionIndicator selected={preloadPages === pages} />
                        {pages} 页
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-(--od-text-tertiary)">频道范围</p>
                <p className="mt-1 text-(--od-text-primary)">
                  {excludedChannelIds.length > 0
                    ? `排除 ${excludedChannelIds.length} 个，保留 ${selectedChannelIds.length} 个频道`
                    : '不排除频道'}
                </p>
              </div>
              <div>
                <p className="text-(--od-text-tertiary)">排除 Tag</p>
                <p className="mt-1 text-(--od-text-primary)">{excludedTags.length ? excludedTags.join('、') : '不额外排除'}</p>
              </div>
              <div>
                <p className="text-(--od-text-tertiary)">Discord 跳转</p>
                <p className="mt-1 text-(--od-text-primary)">{openMode === 'app' ? 'Discord App' : '网页端'}</p>
              </div>
              <div>
                <p className="text-(--od-text-tertiary)">加载方式</p>
                <p className="mt-1 text-(--od-text-primary)">
                  {pagingMode === 'pagination' ? '分页浏览' : '连续滚动'}
                  {preloadEnabled ? ` · 无缝缓冲 ${preloadPages} 页` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={configureAppearance}
                onClick={() => setConfigureAppearance((enabled) => !enabled)}
                className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition-colors ${configureAppearance ? 'bg-emerald-500/12 text-(--od-text-primary)' : 'text-(--od-text-secondary) hover:bg-white/4'}`}
              >
                <div>
                  <p className="font-medium">保存后继续配置外观</p>
                  <p className="mt-1 text-xs leading-5 text-(--od-text-tertiary)">前往现有设置页调整主题和背景图；这一步不是必须的。</p>
                </div>
                <SelectionIndicator selected={configureAppearance} />
              </button>
              {saveError && <p className="text-(--od-error)">{saveError}</p>}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button type="button" onClick={() => setStepIndex((index) => index - 1)} className="od-inline-action od-inline-action-ghost">
                <ArrowLeft className="h-4 w-4" />上一步
              </button>
            ) : (
              <button type="button" onClick={() => void logout()} className="od-inline-action od-inline-action-ghost text-(--od-text-tertiary)">
                <LogOut className="h-4 w-4" />退出登录
              </button>
            )}
          </div>
          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStepIndex((index) => index + 1)}
              className="od-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              下一步<ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={preferencesQuery.isSaving}
              onClick={() => void save()}
              className="od-button-primary rounded-xl px-5 py-2 text-sm disabled:opacity-50"
            >
              {isPreview ? '结束预览' : preferencesQuery.isSaving ? '保存中…' : '保存并进入'}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
