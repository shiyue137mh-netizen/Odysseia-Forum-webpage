import {
    BadgeCheck,
    ChevronDown,
    Dices,
    Eye,
    Layers3,
    Sparkles,
    Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Select } from "@/shared/ui/Select";

import { ThreadCard } from "@/entities/thread/ThreadCard";
import type { Thread } from "@/entities/thread/types";
import { DrawRevealOverlay } from "@/features/draw/components/DrawRevealOverlay";
import { discoveryApi } from "@/features/discovery/api/discoveryApi";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { getDiscoveryPreferenceContext } from "@/features/preferences/lib/discoveryPreferences";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { useChannels } from "@/shared/hooks/useChannels";
import { OmicronIcon } from "@/shared/ui/icons/OmicronIcon";
import { OmicronLoader } from "@/shared/ui/loaders/OmicronLoader";

type DrawScopeMode = "preferences" | "channel";
type DrawOverlayPhase = "charging" | "revealing" | "result" | "error";

const DRAW_HISTORY_KEY = "odysseia_draw_history";
const DRAW_REVEAL_ENABLED_KEY = "odysseia_draw_reveal_enabled";

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

  const [scopeMode, setScopeMode] = useState<DrawScopeMode>("preferences");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
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

  // 持久化揭晓开关
  useEffect(() => {
    try {
      localStorage.setItem(DRAW_REVEAL_ENABLED_KEY, String(revealEnabled));
    } catch {
      // ignore
    }
  }, [revealEnabled]);

  const preferredChannelIds = preferenceContext?.preferredChannelIds || [];
  const availableScopeChannels = useMemo(() => {
    if (preferredChannelIds.length === 0) return allChannels;

    const preferredSet = new Set(preferredChannelIds);
    return allChannels.filter((channel) => preferredSet.has(channel.id));
  }, [allChannels, preferredChannelIds]);

  useEffect(() => {
    if (scopeMode !== "channel") return;

    if (!selectedChannelId) {
      const fallback = availableScopeChannels[0]?.id || "";
      if (fallback) setSelectedChannelId(fallback);
      return;
    }

    if (
      !availableScopeChannels.some(
        (channel) => channel.id === selectedChannelId,
      )
    ) {
      setSelectedChannelId(availableScopeChannels[0]?.id || "");
    }
  }, [availableScopeChannels, scopeMode, selectedChannelId]);

  useEffect(() => {
    if (overlayPhase !== "revealing" || overlayResults.length === 0) return;

    // 移除自动计时的揭晓逻辑，改为由 DrawRevealOverlay 手动控制
    setOverlayRevealedCount(overlayResults.length);
  }, [overlayPhase, overlayResults]);

  const effectiveChannelIds = useMemo(() => {
    if (scopeMode === "channel" && selectedChannelId)
      return [selectedChannelId];
    return preferenceContext?.preferredChannelIds.length
      ? preferenceContext.preferredChannelIds
      : null;
  }, [preferenceContext?.preferredChannelIds, scopeMode, selectedChannelId]);

  const includeTags = preferenceContext?.includeTags || null;
  const excludeTags = preferenceContext?.excludeTags || null;

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
        include_tags: includeTags,
        exclude_tags: excludeTags,
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
  }, [effectiveChannelIds, includeTags, excludeTags, revealEnabled]);

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
    scopeMode === "channel" && selectedChannelId
      ? availableScopeChannels.find((c) => c.id === selectedChannelId)?.name ||
        "未找到频道"
      : "我的偏好池";

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
            {preferenceContext
              ? "偏好过滤已生效"
              : "全社区池"}
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
            disabled={isDrawing}
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
            disabled={isDrawing}
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
              className="w-full max-w-lg mt-4 overflow-hidden"
            >
              <div className="space-y-4 py-4">
                {/* 抽卡范围 */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                    抽卡范围
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScopeMode("preferences")}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                        scopeMode === "preferences"
                          ? "border-(--od-accent) bg-(--od-surface-input) text-(--od-accent) shadow-xs"
                          : "border-(--od-border) bg-(--od-surface-input) text-(--od-text-secondary) hover:border-(--od-accent)/50"
                      }`}
                    >
                      按我的偏好抽
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeMode("channel")}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                        scopeMode === "channel"
                          ? "border-(--od-accent) bg-(--od-surface-input) text-(--od-accent) shadow-xs"
                          : "border-(--od-border) bg-(--od-surface-input) text-(--od-text-secondary) hover:border-(--od-accent)/50"
                      }`}
                    >
                      指定频道抽
                    </button>
                  </div>
                </div>

                {/* 频道选择 */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                    频道选择
                  </p>
                  <Select
                    value={scopeMode === "channel" ? selectedChannelId : ""}
                    options={
                      availableScopeChannels.length === 0
                        ? [{ value: '', label: '当前没有可抽取频道' }]
                        : availableScopeChannels.map((channel) => ({
                            value: channel.id,
                            label: channel.name,
                          }))
                    }
                    onChange={(v) => setSelectedChannelId(v)}
                    disabled={
                      scopeMode !== "channel" ||
                      availableScopeChannels.length === 0
                    }
                    className="w-full"
                  />
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
                  saveDrawHistory([]);
                }}
                className="text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-text-secondary)"
              >
                清除记录
              </button>
            </div>

            {/* 统一横向滚动展示 */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {historyResults.map((thread, index) => (
                <div
                  key={thread.thread_id}
                  className="w-[18rem] shrink-0 snap-start animate-in fade-in zoom-in-95 duration-300"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <ThreadCard thread={thread} onPreview={openPreview} />
                </div>
              ))}
            </div>

            {/* 快速操作（居中） */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => openPreview(historyResults[0])}
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
