import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, FileText, Filter, Hash, Heart, LayoutGrid, MessageCircle, RefreshCw, Share2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useParams, useSearchParams } from 'react-router-dom';

import { ThreadResultsCollection } from '@/entities/thread/ThreadResultsCollection';
import type { Thread } from '@/entities/thread/types';
import { UserHeaderCard } from '@/entities/user/UserHeaderCard';
import { UserStatsGrid } from '@/entities/user/UserStatsGrid';
import { authorsApi } from '@/features/authors/api/authorsApi';
import { resolveAuthorKeywordTrigger } from '@/features/mascot/lib/messageResolver';
import { useMascotStore } from '@/features/mascot/store/mascotStore';
import { searchApi, type UISortMethod } from '@/features/search/api/searchApi';
import { usePreviewThread } from '@/features/search/hooks/usePreviewThread';
import { useChannels } from '@/shared/hooks/useChannels';
import { buildAuthorShareText, copyTextToClipboard } from '@/shared/lib/shareText';
import { FluidDivider } from '@/shared/ui/FluidDivider';
import { ShareTextDialog } from '@/shared/ui/ShareTextDialog';

// ─── 排序选项 ───────────────────────────────────────────────
const SORT_OPTIONS: { value: UISortMethod; label: string }[] = [
  { value: 'created_desc', label: '最新发布' },
  { value: 'last_active_desc', label: '最近活跃' },
  { value: 'reaction_desc', label: '点赞最多' },
  { value: 'reply_desc', label: '回复最多' },
  { value: 'relevance', label: '综合排序' },
];

const DEFAULT_SORT: UISortMethod = 'created_desc';

// ─── URL 参数读写辅助 ────────────────────────────────────────
function parseSortParam(raw: string | null): UISortMethod {
  if (raw && SORT_OPTIONS.some((o) => o.value === raw)) return raw as UISortMethod;
  return DEFAULT_SORT;
}
function parseChannelsParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function serializeChannels(ids: string[]): string {
  return ids.join(',');
}

export function UserProfilePage() {
  const { userId } = useParams();
  const { openPreview } = usePreviewThread();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shareText, setShareText] = useState<string | null>(null);

  useEffect(() => {
    const trigger = resolveAuthorKeywordTrigger(userId);
    if (!trigger) return;

    const mascotStore = useMascotStore.getState();
    mascotStore.triggerKeywordEffects(trigger);
    mascotStore.say(
      Array.isArray(trigger.message.text) ? trigger.message.text[0] : trigger.message.text,
      Array.isArray(trigger.message.emotion) ? trigger.message.emotion[0] : trigger.message.emotion,
    );
  }, [userId]);

  // ─── 从 URL 读取排序 & 频道筛选状态 ──────────────────────
  const sortMethod = parseSortParam(searchParams.get('sort'));
  const selectedChannelIds = useMemo(() => parseChannelsParam(searchParams.get('channels')), [searchParams]);

  const setSort = useCallback(
    (next: UISortMethod) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (next === DEFAULT_SORT) p.delete('sort');
        else p.set('sort', next);
        return p;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const toggleChannel = useCallback(
    (channelId: string) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        const current = parseChannelsParam(p.get('channels'));
        const next = current.includes(channelId)
          ? current.filter((id) => id !== channelId)
          : [...current, channelId];
        if (next.length === 0) p.delete('channels');
        else p.set('channels', serializeChannels(next));
        return p;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const clearChannels = useCallback(() => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('channels');
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  // ─── 数据请求 ────────────────────────────────────────────
  const threadsQuery = useQuery({
    queryKey: ['user-profile', userId, 'threads', sortMethod, selectedChannelIds],
    enabled: Boolean(userId),
    queryFn: () =>
      searchApi.search({
        include_authors: userId ? [userId] : [],
        author_name: userId || undefined,
        sort_method: sortMethod,
        channel_ids: selectedChannelIds.length > 0 ? selectedChannelIds : undefined,
        limit: 48,
      }),
    staleTime: 60 * 1000,
  });

  const profileQuery = useQuery({
    queryKey: ['author-profile', userId],
    enabled: Boolean(userId),
    queryFn: () => authorsApi.getAuthorProfile(userId!),
    staleTime: 5 * 60 * 1000,
  });

  const { data: channelsData } = useChannels();

  const threads = useMemo(() => ((threadsQuery.data?.results || []) as Thread[]), [threadsQuery.data?.results]);

  // 优先使用 profile 接口返回的权威元数据
  const profile = profileQuery.data;
  const authorFromThreads = threads[0]?.author;

  const authorName =
    profile?.display_name ||
    profile?.global_name ||
    authorFromThreads?.display_name ||
    authorFromThreads?.global_name ||
    authorFromThreads?.name ||
    (userId ? `作者 ${userId}` : '未知作者');

  const stats = [
    {
      label: '帖子数量',
      value: profile?.stats.thread_count ?? threadsQuery.data?.total ?? 0,
      icon: FileText,
    },
    {
      label: '累计点赞',
      value: profile?.stats.reaction_count ?? 0,
      icon: Heart,
    },
    {
      label: '累计回复',
      value: profile?.stats.reply_count ?? 0,
      icon: MessageCircle,
    },
    {
      label: '当前加载',
      value: threads.length,
      icon: RefreshCw,
    },
  ];

  const handleShare = () => {
    if (!userId) return;

    setShareText(buildAuthorShareText({
      userId,
      authorName,
      stats: {
        thread_count: profile?.stats.thread_count ?? threadsQuery.data?.total ?? 0,
        reaction_count: profile?.stats.reaction_count ?? 0,
        reply_count: profile?.stats.reply_count ?? 0,
      },
    }));
  };

  const handleCopyShareText = async () => {
    if (!shareText) return;
    const copied = await copyTextToClipboard(shareText);
    if (copied) {
      toast.success('分享文案已复制');
      return;
    }
    toast.warning('自动复制失败，可以手动选中文案复制');
  };

  // ─── 频道列表（用于多选 chips） ───────────────────────────
  const channelOptions = useMemo(() => {
    if (!channelsData?.channels) return [];
    return channelsData.channels
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [channelsData?.channels]);

  const channelNameMap = useMemo(() => {
    const m = new Map<string, string>();
    channelOptions.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [channelOptions]);

  const authorContentProfile = useMemo(() => {
    const tagCounts = new Map<string, number>();
    const channelCounts = new Map<string, number>();

    threads.forEach((thread) => {
      new Set((thread.tags || []).map((tag) => tag.trim()).filter(Boolean)).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      const channelId = String(thread.channel_id || '').trim();
      if (channelId) channelCounts.set(channelId, (channelCounts.get(channelId) || 0) + 1);
    });

    const byCountThenName = ([nameA, countA]: [string, number], [nameB, countB]: [string, number]) =>
      countB - countA || nameA.localeCompare(nameB, 'zh-CN');

    return {
      tags: Array.from(tagCounts.entries()).sort(byCountThenName).slice(0, 3),
      channels: Array.from(channelCounts.entries())
        .map(([id, count]) => [channelNameMap.get(id) || id, count] as [string, number])
        .sort(byCountThenName)
        .slice(0, 2),
    };
  }, [channelNameMap, threads]);

  const hasContentProfile =
    authorContentProfile.tags.length > 0 || authorContentProfile.channels.length > 0;

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-10 p-4 sm:p-6 lg:gap-14 lg:p-8">
        <section>
          <FluidDivider label="Author" tone="strong" className="mb-8 lg:mb-10" />
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <div className="flex flex-col items-center gap-4">
              <div data-tour="user-header" className="w-full">
                <UserHeaderCard
                  user={{
                    id: profile?.id || userId || 'unknown',
                    username: profile?.name || authorFromThreads?.name || authorName,
                    global_name: profile?.global_name || authorName,
                    avatar: undefined,
                  }}
                  avatarUrl={profile?.avatar_url || authorFromThreads?.avatar_url || null}
                  subtitle={`作者主页 · ${userId ? `ID: ${userId}` : '正在加载作者信息'}`}
                />
              </div>

              <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    void threadsQuery.refetch();
                    void profileQuery.refetch();
                  }}
                  className="od-inline-action od-inline-action-ghost w-full justify-center sm:w-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="od-inline-action od-inline-action-ghost w-full justify-center sm:w-auto"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  分享
                </button>
              </div>
            </div>

            <div className="mx-auto h-px w-16 bg-[color-mix(in_srgb,var(--od-text-secondary)_12%,transparent)]" />
            {hasContentProfile && (
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
                <p className="text-[11px] font-medium text-(--od-text-tertiary)">
                  基于当前加载的 {threads.length} 篇作品
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {authorContentProfile.tags.map(([tag, count]) => (
                    <span
                      key={`tag-${tag}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-(--od-surface-soft) px-3 py-1.5 text-xs text-(--od-text-secondary)"
                    >
                      <Hash className="h-3 w-3 text-(--od-accent)" />
                      <span className="max-w-36 truncate">{tag}</span>
                      <span className="tabular-nums text-(--od-text-tertiary)">{count}</span>
                    </span>
                  ))}
                  {authorContentProfile.channels.map(([channel, count]) => (
                    <span
                      key={`channel-${channel}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-(--od-surface-soft) px-3 py-1.5 text-xs text-(--od-text-secondary)"
                    >
                      <LayoutGrid className="h-3 w-3 text-(--od-accent)" />
                      <span className="max-w-36 truncate">{channel}</span>
                      <span className="tabular-nums text-(--od-text-tertiary)">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div data-tour="user-stats">
              <UserStatsGrid items={stats} />
            </div>
          </div>
        </section>

        <section className="px-1">
          <FluidDivider label="Threads" className="mb-8" />

          {/* ─── 排序 & 频道筛选工具条 ─────────────────────── */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* 排序 */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSort(opt.value)}
                      data-active={sortMethod === opt.value}
                      className="od-option-inline rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 频道多选 */}
            <div className="flex flex-wrap items-start gap-2">
              <Filter className="mt-1 h-3.5 w-3.5 shrink-0 text-(--od-text-tertiary)" />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={clearChannels}
                  data-active={selectedChannelIds.length === 0}
                  className="od-option-inline rounded-full px-3 py-1 text-xs font-medium transition-colors"
                >
                  全部频道
                </button>
                {channelOptions.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    data-active={selectedChannelIds.includes(ch.id)}
                    className="od-option-inline rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 已选频道指示器 */}
            {selectedChannelIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-(--od-text-secondary)">
                <span className="font-medium text-(--od-text-label)">已选频道：</span>
                {selectedChannelIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--od-accent)_12%,transparent)] px-2.5 py-0.5 text-(--od-text-primary)"
                  >
                    {channelNameMap.get(id) || id}
                    <button
                      type="button"
                      onClick={() => toggleChannel(id)}
                      className="text-(--od-text-tertiary) transition-colors hover:text-(--od-text-primary)"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearChannels}
                  className="text-(--od-text-tertiary) underline underline-offset-2 transition-colors hover:text-(--od-text-primary)"
                >
                  清除
                </button>
              </div>
            )}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-(--od-text-secondary)">
            <FileText className="h-4 w-4 text-(--od-accent)" />
            <span>这位作者的帖子</span>
            <span className="mx-1 text-(--od-text-tertiary)">·</span>
            <Heart className="h-4 w-4" />
            <span>{profile?.stats.reaction_count ?? '-'}</span>
            <span className="mx-1 text-(--od-text-tertiary)">·</span>
            <MessageCircle className="h-4 w-4" />
            <span>{profile?.stats.reply_count ?? '-'}</span>
            {threadsQuery.data?.total != null && (
              <>
                <span className="mx-1 text-(--od-text-tertiary)">·</span>
                <span className="font-medium text-(--od-text-value)">{threadsQuery.data.total}</span>
                <span>条结果</span>
              </>
            )}
          </div>

          {threadsQuery.isLoading ? (
            <p className="text-sm text-(--od-text-secondary)">正在加载这位作者的帖子...</p>
          ) : threadsQuery.isError ? (
            <p className="text-sm text-(--od-error)">加载失败了，稍后再试试吧。</p>
          ) : threads.length === 0 ? (
            <p className="text-sm text-(--od-text-secondary)">这位作者还没有发布过帖子。</p>
          ) : (
            <ThreadResultsCollection
              threads={threads}
              onPreview={openPreview}
            />
          )}
        </section>
      </div>
      {shareText && (
        <ShareTextDialog
          title="分享这位作者"
          text={shareText}
          onClose={() => setShareText(null)}
          onCopy={handleCopyShareText}
        />
      )}
    </>
  );
}
