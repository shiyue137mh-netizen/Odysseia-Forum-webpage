import {
    BadgeCheck,
    ChevronDown,
    Dices,
    Eye,
    Layers3,
    RotateCcw,
    Sparkles,
    Tags,
    Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import type { Thread } from "@/entities/thread/types";
import { DrawRevealOverlay } from "@/features/draw/components/DrawRevealOverlay";
import { discoveryApi } from "@/features/discovery/api/discoveryApi";
import { DiscoveryThreadCarousel } from "@/features/discovery/components/DiscoveryThreadCarousel";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { getDiscoveryPreferenceContext } from "@/features/preferences/lib/discoveryPreferences";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { useChannels, type ApiChannel } from "@/shared/hooks/useChannels";
import { OmicronIcon } from "@/shared/ui/icons/OmicronIcon";
import { OmicronLoader } from "@/shared/ui/loaders/OmicronLoader";

type DrawScopeMode = "all" | "preferences" | "custom";
type DrawOverlayPhase = "charging" | "revealing" | "result" | "error";

interface DrawRecipe {
  scopeMode: DrawScopeMode;
  channelIds: string[];
  includeTags: string[];
  excludeTags: string[];
  tagLogic: "and" | "or";
}

interface DrawTagGroup {
  id: string;
  name: string;
  tags: string[];
}

const DRAW_HISTORY_KEY = "odysseia_draw_history";
const DRAW_REVEAL_ENABLED_KEY = "odysseia_draw_reveal_enabled";
const DRAW_RECIPE_KEY = "odysseia_draw_recipe";
const DEFAULT_DRAW_RECIPE: DrawRecipe = {
  scopeMode: "preferences",
  channelIds: [],
  includeTags: [],
  excludeTags: [],
  tagLogic: "and",
};

function normalizeStrings(values: unknown[]) {
  return Array.from(new Set(
    values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

function loadDrawRecipe(): DrawRecipe | null {
  try {
    const raw = localStorage.getItem(DRAW_RECIPE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DrawRecipe>;
    if (!['all', 'preferences', 'custom'].includes(parsed.scopeMode || '')) return null;
    return {
      scopeMode: parsed.scopeMode as DrawScopeMode,
      channelIds: normalizeStrings(Array.isArray(parsed.channelIds) ? parsed.channelIds : []),
      includeTags: normalizeStrings(Array.isArray(parsed.includeTags) ? parsed.includeTags : []),
      excludeTags: normalizeStrings(Array.isArray(parsed.excludeTags) ? parsed.excludeTags : []),
      tagLogic: parsed.tagLogic === 'or' ? 'or' : 'and',
    };
  } catch {
    return null;
  }
}

function saveDrawRecipe(recipe: DrawRecipe) {
  try {
    localStorage.setItem(DRAW_RECIPE_KEY, JSON.stringify(recipe));
  } catch {
    // ignore
  }
}

function getChannelTags(channel: ApiChannel) {
  return normalizeStrings([
    ...(channel.available_tags || []).map((tag) => tag.name),
    ...(channel.virtual_tags || []).map((tag) => tag.tag_name),
    ...(channel.mapped_source_channels || []).flatMap((source) =>
      (source.available_tags || []).map((tag) => tag.name),
    ),
  ]);
}

export function buildDrawTagGroups(channels: ApiChannel[], activeChannelIds: string[] | null) {
  const activeSet = activeChannelIds ? new Set(activeChannelIds) : null;
  const scoped = channels
    .filter((channel) => !activeSet || activeSet.has(channel.channel_id))
    .map((channel) => ({ id: channel.channel_id, name: channel.name, tags: getChannelTags(channel) }));
  if (scoped.length <= 1) {
    return scoped.filter((channel) => channel.tags.length > 0);
  }

  const counts = new Map<string, number>();
  for (const channel of scoped) {
    for (const tag of channel.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }

  return [
    {
      id: 'shared',
      name: '共有标签',
      tags: Array.from(counts).filter(([, count]) => count > 1).map(([tag]) => tag),
    },
    ...scoped.map((channel) => ({
      id: `channel-${channel.id}`,
      name: `${channel.name} · 特色`,
      tags: channel.tags.filter((tag) => counts.get(tag) === 1),
    })),
  ].filter((group) => group.tags.length > 0);
}

/** 从 localStorage 恢复上次的抽卡结果 */
function loadDrawHistory(): Thread[] {
  try {
    const raw = localStorage.getItem(DRAW_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Thread[];
  } catch {
    return [];
  }
}
/** 将抽卡结果持久化到 localStorage */
function saveDrawHistory(results: Thread[]): void {
  try {
    localStorage.setItem(DRAW_HISTORY_KEY, JSON.stringify(results));
  } catch {
    // 忽略写入失败
  }
}

/** 读取揭晓动画开关 */
function loadRevealEnabled(): boolean {
  try {
    const raw = localStorage.getItem(DRAW_REVEAL_ENABLED_KEY);
    if (raw === null) return true; // 默认开启
    return raw === "true";
  } catch {
    return true;
  }
}

export function DrawPage() {
  const { openPreview } = usePreviewThread();
  const { preferences } = useUserPreferences({ guildId: GUILD_ID });
  const preferenceContext = useMemo(
    () => getDiscoveryPreferenceContext(preferences),
    [preferences],
  );

  const { data: channelsData } = useChannels();
  const allChannels = useMemo(() => {
    return channelsData?.channels || [];
  }, [channelsData?.channels]);

  const [storedRecipe] = useState<DrawRecipe | null>(() => loadDrawRecipe());
  const recipeInitializedRef = useRef(Boolean(storedRecipe));
  const [recipe, setRecipe] = useState<DrawRecipe>(storedRecipe || DEFAULT_DRAW_RECIPE);
  const [_drawResults, setDrawResults] = useState<Thread[]>([]);
  const [overlayResults, setOverlayResults] = useState<Thread[]>([]);
  const [lastDrawCount, setLastDrawCount] = useState<number>(1);
  const [_revealedCount, setRevealedCount] = useState<number>(0);
  const [overlayRevealedCount, setOverlayRevealedCount] = useState<number>(0);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayPhase, setOverlayPhase] =
    useState<DrawOverlayPhase>("charging");
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [revealEnabled, setRevealEnabled] = useState(() => loadRevealEnabled());
  const drawSequenceRef = useRef(0);
  const skipRevealRef = useRef(false);

  // 历史记录：从 localStorage 恢复
  const [historyResults, setHistoryResults] = useState<Thread[]>(() => loadDrawHistory());
  const [historyActiveIndex, setHistoryActiveIndex] = useState(0);

  // 持久化揭晓开关
  useEffect(() => {
    try {
      localStorage.setItem(DRAW_REVEAL_ENABLED_KEY, String(revealEnabled));
    } catch {
      // ignore
    }
  }, [revealEnabled]);

  useEffect(() => {
    saveDrawRecipe(recipe);
  }, [recipe]);

  const preferredChannelIds = preferenceContext?.preferredChannelIds || [];
  useEffect(() => {
    if (recipeInitializedRef.current || !preferences) return;
    recipeInitializedRef.current = true;
    setRecipe({
      ...DEFAULT_DRAW_RECIPE,
      includeTags: preferenceContext?.includeTags || [],
      excludeTags: preferenceContext?.excludeTags || [],
    });
  }, [preferenceContext?.excludeTags, preferenceContext?.includeTags, preferences]);

  useEffect(() => {
    if (overlayPhase !== "revealing" || overlayResults.length === 0) return;

    // 移除自动计时的揭晓逻辑，改为由 DrawRevealOverlay 手动控制
    setOverlayRevealedCount(overlayResults.length);
  }, [overlayPhase, overlayResults]);

  const effectiveChannelIds = useMemo(() => {
    if (recipe.scopeMode === "all") return null;
    if (recipe.scopeMode === "custom") return recipe.channelIds.length ? recipe.channelIds : null;
    return preferredChannelIds.length ? preferredChannelIds : null;
  }, [preferredChannelIds, recipe.channelIds, recipe.scopeMode]);

  const tagGroups = useMemo<DrawTagGroup[]>(() => {
    const visibleChannelIds = new Set(allChannels.map((channel) => channel.id));
    const apiChannels = (channelsData?.apiData || []).filter((channel) =>
      visibleChannelIds.has(channel.channel_id),
    );
    const tagPoolChannelIds = recipe.scopeMode === 'custom' ? recipe.channelIds : effectiveChannelIds;
    const groups = buildDrawTagGroups(apiChannels, tagPoolChannelIds);
    const catalogTags = new Set(groups.flatMap((group) => group.tags));
    const selectedOutsidePool = normalizeStrings([
      ...recipe.includeTags,
      ...recipe.excludeTags,
    ]).filter((tag) => !catalogTags.has(tag));
    return selectedOutsidePool.length
      ? [{ id: 'current-selection', name: '当前配方', tags: selectedOutsidePool }, ...groups]
      : groups;
  }, [allChannels, channelsData?.apiData, effectiveChannelIds, recipe.channelIds, recipe.excludeTags, recipe.includeTags, recipe.scopeMode]);

  const toggleRecipeChannel = useCallback((channelId: string) => {
    setRecipe((current) => ({
      ...current,
      channelIds: current.channelIds.includes(channelId)
        ? current.channelIds.filter((id) => id !== channelId)
        : [...current.channelIds, channelId],
    }));
  }, []);

  const toggleRecipeTag = useCallback((tag: string) => {
    setRecipe((current) => {
      if (current.includeTags.includes(tag)) {
        return {
          ...current,
          includeTags: current.includeTags.filter((item) => item !== tag),
          excludeTags: [...current.excludeTags, tag],
        };
      }
      if (current.excludeTags.includes(tag)) {
        return {
          ...current,
          excludeTags: current.excludeTags.filter((item) => item !== tag),
        };
      }
      return { ...current, includeTags: [...current.includeTags, tag] };
    });
  }, []);

  const restorePreferenceRecipe = useCallback(() => {
    setRecipe({
      scopeMode: "preferences",
      channelIds: [],
      includeTags: preferenceContext?.includeTags || [],
      excludeTags: preferenceContext?.excludeTags || [],
      tagLogic: "and",
    });
  }, [preferenceContext?.excludeTags, preferenceContext?.includeTags]);

  const canDraw = recipe.scopeMode !== "custom" || recipe.channelIds.length > 0;

  const handleDraw = useCallback(async (count: number) => {
    const sequenceId = drawSequenceRef.current + 1;
    drawSequenceRef.current = sequenceId;
    skipRevealRef.current = false;

    try {
      setIsDrawing(true);
      setError(null);
      setDrawResults([]);
      setRevealedCount(0);
      setOverlayResults([]);
      setOverlayRevealedCount(0);

      // 仅在开启揭晓动画时显示 overlay
      if (revealEnabled) {
        setOverlayOpen(true);
        setOverlayPhase("charging");
      }

      const results = await discoveryApi.getRandomThreads({
        limit: count,
        channel_ids: effectiveChannelIds,
        include_tags: recipe.includeTags,
        exclude_tags: recipe.excludeTags,
        tag_logic: recipe.tagLogic,
      });

      if (drawSequenceRef.current !== sequenceId) return;

      setLastDrawCount(count);

      // 持久化到历史
      if (results.length > 0) {
        setHistoryResults(results);
        saveDrawHistory(results);
      }

      if (!revealEnabled) {
        // 跳过揭晓动画，直接展示到底部
        setDrawResults(results);
        setRevealedCount(results.length);
        return;
      }

      setOverlayResults(results);

      await new Promise((resolve) => window.setTimeout(resolve, 760));
      if (drawSequenceRef.current !== sequenceId) return;

      if (results.length === 0) {
        setOverlayPhase("result");
        setDrawResults([]);
        setRevealedCount(0);
        return;
      }

      if (skipRevealRef.current) {
        setOverlayPhase("result");
        setOverlayRevealedCount(results.length);
        setDrawResults(results);
        setRevealedCount(results.length);
        return;
      }

      setOverlayPhase("revealing");
    } catch (err) {
      console.error("Failed to draw randomly", err);
      setError("抽卡失败了，可能是由于网络波动或当前范围内内容不足。");
      if (revealEnabled) {
        setOverlayPhase("error");
        setOverlayOpen(true);
      }
    } finally {
      setIsDrawing(false);
    }
  }, [effectiveChannelIds, recipe.excludeTags, recipe.includeTags, recipe.tagLogic, revealEnabled]);

  const handleSkipOverlay = () => {
    skipRevealRef.current = true;
    if (overlayResults.length === 0) return;
    if (overlayPhase === "result" || overlayPhase === "error") return;
    setOverlayRevealedCount(overlayResults.length);
    setOverlayPhase("result");
    setDrawResults(overlayResults);
    setRevealedCount(overlayResults.length);
  };

  const activeScopeLabel =
    recipe.scopeMode === "all"
      ? "全社区池"
      : recipe.scopeMode === "preferences"
        ? preferredChannelIds.length > 0 ? "我的偏好频道" : "全社区池"
        : recipe.channelIds.length > 0
          ? `自选 ${recipe.channelIds.length} 个频道`
          : "请选择频道";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-0 p-4 sm:p-6 lg:p-8">
      {/* ─── 仪式中心区域 ─── */}
      <section className="relative flex flex-col items-center justify-center py-12 sm:py-16 lg:py-20">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <div className="od-editorial-kicker mb-4 justify-center text-(--od-text-tertiary)">
            <Sparkles className="h-3.5 w-3.5" />
            Surprise Discovery
          </div>
          <h1 className="od-hero-title text-(--od-text-primary)">
            随机抽卡
          </h1>
          <p className="mt-3 max-w-md mx-auto text-sm leading-6 text-(--od-text-secondary)">
            让我从数万张帖子里为你挑几张。抽出来的内容像拆小盲盒一样，一张张看会很有意思呢。
          </p>
        </motion.div>

        {/* 状态胶囊 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-(--od-text-secondary)"
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-(--od-border) bg-(--od-surface-input) px-3 py-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-(--od-accent)" />
            {recipe.includeTags.length || recipe.excludeTags.length
              ? `包含 ${recipe.includeTags.length} · 排除 ${recipe.excludeTags.length}`
              : "未限制标签"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-(--od-border) bg-(--od-surface-input) px-3 py-1.5">
            <Layers3 className="h-3.5 w-3.5 text-(--od-accent)" />
            {activeScopeLabel}
          </span>
        </motion.div>

        {/* ─── 核心抽卡按钮 ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-3"
        >
          <button
            type="button"
            disabled={isDrawing || !canDraw}
            onClick={() => handleDraw(1)}
            className="group relative flex items-center gap-3 rounded-2xl border border-(--od-accent)/40 bg-linear-to-br from-(--od-accent)/16 to-(--od-accent)/6 px-8 py-4 text-base font-bold text-(--od-accent) shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl hover:border-(--od-accent)/60 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed sm:px-10 sm:py-5 sm:text-lg"
          >
            {isDrawing && lastDrawCount === 1 ? (
              <OmicronLoader className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:rotate-12" />
            )}
            来一抽
          </button>
          <button
            type="button"
            disabled={isDrawing || !canDraw}
            onClick={() => handleDraw(10)}
            className="group relative flex items-center gap-3 rounded-2xl border border-(--od-border) bg-(--od-surface-input) px-8 py-4 text-base font-semibold text-(--od-text-primary) shadow-md transition-all hover:scale-[1.03] hover:shadow-lg hover:border-(--od-accent)/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed sm:px-10 sm:py-5 sm:text-lg"
          >
            {isDrawing && lastDrawCount === 10 ? (
              <OmicronLoader className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Dices className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:-rotate-12" />
            )}
            十连发现
          </button>
        </motion.div>

        {/* 配置展开/收起 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8"
        >
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-(--od-text-tertiary) transition-colors hover:text-(--od-text-secondary)"
          >
            调整范围
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`} />
          </button>
        </motion.div>

        {/* 配置面板 (折叠) */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="mt-4 w-full max-w-2xl overflow-hidden"
            >
              <div className="space-y-4 py-4">
                {/* 抽卡范围 */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                      基础卡池
                    </p>
                    <button
                      type="button"
                      onClick={restorePreferenceRecipe}
                      className="inline-flex items-center gap-1 text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-accent)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      恢复我的偏好
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["all", "全社区"],
                      ["preferences", "偏好频道"],
                      ["custom", "自选频道"],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setRecipe((current) => ({ ...current, scopeMode: mode }))}
                        className={`rounded-2xl border px-3 py-3 text-sm transition-colors ${
                          recipe.scopeMode === mode
                            ? "border-(--od-accent) text-(--od-accent) shadow-xs"
                            : "border-(--od-border) text-(--od-text-secondary) hover:border-(--od-accent)/50 hover:text-(--od-accent)"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {recipe.scopeMode === "custom" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                      自选频道
                    </p>
                    <div className="od-chrome-surface flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-2xl p-3">
                      {allChannels.map((channel) => {
                        const active = recipe.channelIds.includes(channel.id);
                        return (
                          <button
                            key={channel.id}
                            type="button"
                            onClick={() => toggleRecipeChannel(channel.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                              active
                                ? "border-(--od-accent)/50 text-(--od-accent)"
                                : "border-white/8 text-(--od-text-secondary) hover:border-(--od-accent)/30 hover:text-(--od-accent)"
                            }`}
                          >
                            {channel.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                      <Tags className="h-3.5 w-3.5" />
                      Tag 配方
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      {([['or', '任一'], ['and', '全部']] as const).map(([logic, label]) => (
                        <button
                          key={logic}
                          type="button"
                          onClick={() => setRecipe((current) => ({ ...current, tagLogic: logic }))}
                          className={`rounded-lg px-2 py-1 transition-colors ${
                            recipe.tagLogic === logic
                              ? 'text-(--od-accent)'
                              : 'text-(--od-text-tertiary) hover:text-(--od-accent)'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mb-2 text-[11px] text-(--od-text-tertiary)">
                    点击切换：包含 → 排除 → 不限
                  </p>
                  <div className="od-chrome-surface max-h-64 space-y-4 overflow-y-auto rounded-2xl p-3">
                    {tagGroups.length > 0 ? tagGroups.map((group) => (
                      <section key={group.id}>
                        <h3 className="mb-2 text-[11px] font-semibold text-(--od-text-tertiary)">{group.name}</h3>
                        <div className="flex flex-wrap gap-2">
                          {group.tags.map((tag) => {
                            const included = recipe.includeTags.includes(tag);
                            const excluded = recipe.excludeTags.includes(tag);
                            return (
                              <button
                                key={`${group.id}-${tag}`}
                                type="button"
                                onClick={() => toggleRecipeTag(tag)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                                  included
                                    ? 'border-emerald-500/40 text-emerald-300'
                                    : excluded
                                      ? 'border-rose-500/40 text-rose-300'
                                      : 'border-white/8 text-(--od-text-secondary) hover:border-(--od-accent)/30 hover:text-(--od-accent)'
                                }`}
                              >
                                {included ? '+ ' : excluded ? '− ' : ''}{tag}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )) : (
                      <span className="text-xs text-(--od-text-tertiary)">当前卡池暂时没有可用 Tag</span>
                    )}
                  </div>
                </div>

                {/* 揭晓动画开关 */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div>
                    <p className="text-sm font-medium text-(--od-text-primary)">
                      揭晓动画
                    </p>
                    <p className="text-xs text-(--od-text-tertiary) mt-0.5">
                      关闭后抽卡结果将直接展示在页面底部
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={revealEnabled}
                    onClick={() => setRevealEnabled(!revealEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      revealEnabled ? "bg-(--od-accent)" : "bg-(--od-border)"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        revealEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ─── 页面级加载 (揭晓关闭时) ─── */}
      {isDrawing && !revealEnabled && (
        <section className="flex flex-col items-center justify-center py-12">
          <OmicronLoader className="h-8 w-8 mb-3" />
          <p className="text-sm text-(--od-text-secondary)">
            正在为你从几万张帖子里挑…
          </p>
        </section>
      )}

      {/* ─── 错误提示 (页面级) ─── */}
      {error && !overlayOpen && (
        <section className="px-1 mb-6">
          <div className="od-draw-slot text-center">
            <p className="text-base font-semibold text-(--od-text-primary)">
              哎呀，抽卡失败了
            </p>
            <p className="mt-2 text-sm leading-6 text-(--od-text-secondary)">
              {error}
            </p>
            <button
              type="button"
              onClick={() => handleDraw(lastDrawCount)}
              className="od-inline-action od-inline-action-primary mt-4"
            >
              <Wand2 className="h-4 w-4" />
              重试一下
            </button>
          </div>
        </section>
      )}

      {/* ─── 上次发现 (底部历史记录 · 统一横向滚动) ─── */}
      <AnimatePresence>
        {historyResults.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 px-1"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--od-text-label)">
                  上次发现
                </p>
                <p className="mt-1 text-xs text-(--od-text-tertiary)">
                  共 {historyResults.length} 张 · 点击可预览
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryResults([]);
                  setHistoryActiveIndex(0);
                  saveDrawHistory([]);
                }}
                className="text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-text-secondary)"
              >
                清除记录
              </button>
            </div>

            <DiscoveryThreadCarousel
              threads={historyResults}
              ariaLabel="上次抽卡结果，可滚轮或左右滑动"
              emptyMessage="暂时没有抽卡记录。"
              onOpen={openPreview}
              onActiveChange={(_, index) => setHistoryActiveIndex(index)}
            />

            {/* 快速操作（居中） */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() =>
                  openPreview(
                    historyResults[historyActiveIndex] || historyResults[0],
                  )
                }
                className="od-inline-action od-inline-action-primary"
              >
                <Eye className="h-4 w-4" />
                查看详情
              </button>
              <button
                type="button"
                onClick={() => handleDraw(lastDrawCount)}
                className="od-inline-action od-inline-action-soft"
              >
                <Wand2 className="h-4 w-4" />
                再来一次
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── 空状态 (从未抽过卡) ─── */}
      {historyResults.length === 0 && !isDrawing && !error && (
        <section className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--od-surface-soft) text-(--od-accent)">
            <OmicronIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-5 text-lg font-bold tracking-tight text-(--od-text-primary)">
            第一张卡还在等你揭晓哦～
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-(--od-text-secondary)">
            点上面的按钮开始抽卡，我会把结果乖乖送到你面前的。
          </p>
        </section>
      )}

      <DrawRevealOverlay
        isOpen={overlayOpen}
        phase={overlayPhase}
        results={overlayResults}
        revealedCount={overlayRevealedCount}
        drawCount={lastDrawCount}
        isDrawing={isDrawing}
        error={error}
        onClose={() => setOverlayOpen(false)}
        onSkip={handleSkipOverlay}
        onRetry={() => handleDraw(lastDrawCount)}
        onPreview={openPreview}
        onDrawAgain={handleDraw}
      />
    </div>
  );
}
