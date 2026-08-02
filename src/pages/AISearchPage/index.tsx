import { MASCOT_IMAGES } from '@/features/mascot/assets';
import { fetchModelIds } from '@/features/ai-search/api/modelsApi';
import { AISearchResponse } from '@/features/ai-search/components/AISearchResponse';
import {
  AISearchTokenInput,
  type AISearchMentionChannel,
} from '@/features/ai-search/components/AISearchTokenInput';
import { AISearchUserMessage } from '@/features/ai-search/components/AISearchUserMessage';
import { runAISearchAgent, type AISearchAgentProgress } from '@/features/ai-search/lib/agent';
import { buildAISearchContext } from '@/features/ai-search/lib/context';
import { getStreamingSafeContent } from '@/features/ai-search/lib/responseParser';
import type { AISearchInlineToken } from '@/features/ai-search/lib/inlineTokens';
import { findPendingAISearchQuestion, type AISearchStatus } from '@/features/ai-search/lib/tools';
import {
  abortAISearchConversation,
  registerAISearchController,
  unregisterAISearchController,
  useAISearchConversationStore,
  type AISearchDisplayMessage,
} from '@/features/ai-search/lib/session';
import { formatAISearchDuration, formatAISearchTimestamp } from '@/features/ai-search/lib/time';
import { useUserPreferences } from '@/features/preferences/hooks/useUserPreferences';
import { usePreviewThread } from '@/features/search/hooks/usePreviewThread';
import { useChannels } from '@/shared/hooks/useChannels';
import { showMascotToast } from '@/features/mascot/lib/mascotToast';
import { addToken } from '@/shared/lib/searchTokenizer';
import {
  DEFAULT_AI_SEARCH_SYSTEM_PROMPT,
  loadAISearchSettings,
  saveAISearchSettings,
  type AISearchSettings,
} from '@/features/ai-search/lib/settings';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Check, ChevronUp, Pencil, RefreshCw, RotateCcw, Settings, Square, SquarePen, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

type AISearchLiveResponse = AISearchAgentProgress & {
  conversationId: string;
  startedAt: number;
};

const QUICK_QUESTIONS = [
  '上周最热门的是什么？',
  '帮我在一周内的作品里搜索一下我喜欢的东西。',
] as const;

const INPUT_PLACEHOLDERS = [
  '你今天想搜什么？',
  '试试输入 @，直接选择 Tag、作者或频道',
  '最近想看点什么？',
  '有个模糊的想法也可以告诉我',
] as const;

export function AISearchPage() {
  const { openPreview } = usePreviewThread();
  const { user, preferences } = useUserPreferences();
  const channelsQuery = useChannels();
  const [settings, setSettings] = useState(loadAISearchSettings);
  const [draftSettings, setDraftSettings] = useState(settings);
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(
    () => Math.floor(Math.random() * INPUT_PLACEHOLDERS.length),
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = useAISearchConversationStore((state) => state.activeConversationId);
  const conversations = useAISearchConversationStore((state) => state.conversations);
  const startConversation = useAISearchConversationStore((state) => state.startConversation);
  const appendMessage = useAISearchConversationStore((state) => state.appendMessage);
  const appendMessages = useAISearchConversationStore((state) => state.appendMessages);
  const replaceMessages = useAISearchConversationStore((state) => state.replaceMessages);
  const selectConversation = useAISearchConversationStore((state) => state.selectConversation);
  const startNewConversation = useAISearchConversationStore((state) => state.startNewConversation);
  const runningConversationIds = useAISearchConversationStore((state) => state.runningConversationIds);
  const setConversationRunning = useAISearchConversationStore((state) => state.setConversationRunning);
  const markConversationUnread = useAISearchConversationStore((state) => state.markConversationUnread);
  const markConversationRead = useAISearchConversationStore((state) => state.markConversationRead);
  const [status, setStatus] = useState<AISearchStatus | 'idle'>('idle');
  const [liveResponse, setLiveResponse] = useState<AISearchLiveResponse | null>(null);
  const [liveClock, setLiveClock] = useState(Date.now());
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [settingsTab, setSettingsTab] = useState<'api' | 'prompt'>('api');
  const [followupsVisible, setFollowupsVisible] = useState(false);
  const [customQuestionAnswer, setCustomQuestionAnswer] = useState('');
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const liveResponsesRef = useRef(new Map<string, AISearchLiveResponse>());
  const shownFollowupKeyRef = useRef<string | null>(null);
  const followupTimerRef = useRef<number | null>(null);
  const isRunning = Boolean(
    activeConversationId && runningConversationIds.includes(activeConversationId),
  );
  const context = useMemo(
    () => buildAISearchContext({ user, preferences, channels: channelsQuery.data?.apiData }),
    [channelsQuery.data?.apiData, preferences, user],
  );
  const mentionChannels = useMemo<AISearchMentionChannel[]>(() => {
    const apiChannels = new Map(
      (channelsQuery.data?.apiData || []).map((channel) => [channel.channel_id, channel]),
    );
    return (channelsQuery.data?.channels || []).map((channel) => {
      const apiChannel = apiChannels.get(channel.id);
      return {
        id: channel.id,
        name: channel.name,
        tags: Array.from(new Set([
          ...(apiChannel?.available_tags || []).map((tag) => tag.name),
          ...(apiChannel?.virtual_tags || []).map((tag) => tag.tag_name),
        ].filter(Boolean))),
      };
    });
  }, [channelsQuery.data]);
  const messages = useMemo(
    () => conversations.find((item) => item.id === activeConversationId)?.messages || [],
    [activeConversationId, conversations],
  );
  const pendingQuestion = useMemo(() => findPendingAISearchQuestion(messages), [messages]);
  const latestUserMessageIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'user') return index;
    }
    return -1;
  }, [messages]);
  const requestedConversationId = searchParams.get('conversation');

  useEffect(() => {
    if (requestedConversationId) {
      if (conversations.some((item) => item.id === requestedConversationId)) {
        markConversationRead(requestedConversationId);
        if (activeConversationId !== requestedConversationId) {
          selectConversation(requestedConversationId);
        }
        return;
      }
      startNewConversation();
      setSearchParams({}, { replace: true });
      return;
    }

    if (activeConversationId) {
      setSearchParams({ conversation: activeConversationId }, { replace: true });
    }
  }, [
    activeConversationId,
    conversations,
    requestedConversationId,
    selectConversation,
    markConversationRead,
    setSearchParams,
    startNewConversation,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setEditingMessageIndex(null);
      setEditDraft('');
      setLiveResponse(
        activeConversationId ? liveResponsesRef.current.get(activeConversationId) ?? null : null,
      );
      setStatus(
        activeConversationId && runningConversationIds.includes(activeConversationId)
          ? 'thinking'
          : 'idle',
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeConversationId, runningConversationIds]);

  useEffect(() => {
    const container = conversationScrollRef.current;
    if (!container || !liveResponse) return;
    const frame = window.requestAnimationFrame(() => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 180) container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [liveResponse]);

  useEffect(() => {
    if (!liveResponse) return;
    const timer = window.setInterval(() => setLiveClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [liveResponse]);

  const mascotEmotion: Record<typeof status, string> = {
    idle: 'hi',
    thinking: 'write',
    searching: 'searching',
    reading: 'tea',
    complete: 'success',
    error: 'error',
  };
  const effectiveStatus = isRunning && status === 'idle' ? 'thinking' : status;
  const statusText: Partial<Record<typeof status, string>> = {
    thinking: '正在理解你的需求……',
    searching: '正在调整条件搜索候选作品……',
    reading: '正在阅读候选作品的首楼……',
  };

  const openSettings = () => {
    setDraftSettings(settings);
    setSettingsTab('api');
    settingsDialogRef.current?.showModal();
  };

  const updateDraft = <K extends keyof AISearchSettings>(
    key: K,
    value: AISearchSettings[K],
  ) => setDraftSettings((current) => ({ ...current, [key]: value }));

  const saveSettings = () => {
    const next = {
      ...draftSettings,
      systemPrompt: draftSettings.systemPrompt.trim() || DEFAULT_AI_SEARCH_SYSTEM_PROMPT,
    };
    saveAISearchSettings(next);
    setSettings(next);
    settingsDialogRef.current?.close();
    toast.success('AI 搜索设置已保存在这个浏览器中');
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const nextModelIds = await fetchModelIds({
        baseUrl: draftSettings.baseUrl,
        apiKey: draftSettings.apiKey,
        sendClientHeader: draftSettings.sendClientHeader,
      });
      setModelIds(nextModelIds);
      if (!nextModelIds.includes(draftSettings.model)) {
        updateDraft('model', nextModelIds[0]);
      }
      toast.success(`获取到 ${nextModelIds.length} 个模型`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取模型失败');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const ensureModelConfigured = () => {
    if (!settings.baseUrl || !settings.model) {
      showMascotToast({
        id: 'ai-search-provider-required',
        emotion: 'searching',
        eyebrow: 'AI Provider',
        title: '还需要配置自己的模型 API',
        message: '这里提供的是搜索 Agent 入口，不包含免费的模型服务。先填写 API 地址并选择模型，再让我帮你搜索吧。',
        actionLabel: '去配置',
        onAction: openSettings,
        duration: 9000,
      });
      return false;
    }
    return true;
  };

  const executeTurn = async (
    conversationId: string,
    userMessage: string | undefined,
    history: typeof messages,
  ) => {
    const startedAt = Date.now();
    const controller = new AbortController();
    if (!registerAISearchController(conversationId, controller)) return;
    setConversationRunning(conversationId, true);
    setStatus('thinking');
    const initialProgress = { conversationId, startedAt, content: '', trace: [], threads: [] };
    liveResponsesRef.current.set(conversationId, initialProgress);
    setLiveResponse(initialProgress);
    try {
      const result = await runAISearchAgent({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        sendClientHeader: settings.sendClientHeader,
        systemPrompt: settings.systemPrompt,
        context,
        userTaste: settings.userTaste,
        userMessage,
        history,
        onStatus: (nextStatus) => {
          if (useAISearchConversationStore.getState().activeConversationId === conversationId) {
            setStatus(nextStatus);
          }
        },
        onProgress: (progress) => {
          const nextProgress = { conversationId, startedAt, ...progress };
          liveResponsesRef.current.set(conversationId, nextProgress);
          if (useAISearchConversationStore.getState().activeConversationId === conversationId) {
            setLiveResponse(nextProgress);
          }
        },
        signal: controller.signal,
      });
      if (result.pendingQuestion) {
        appendMessages(conversationId, result.turnMessages);
      } else {
        appendMessages(conversationId, [
          ...result.turnMessages,
          {
            role: 'assistant',
            content: result.answer,
            reasoning: result.reasoning,
            trace: result.trace,
            threads: result.threads,
            durationMs: Date.now() - startedAt,
            usage: result.usage,
            followups: result.followups,
          },
        ]);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        const progress = liveResponsesRef.current.get(conversationId);
        const partialContent = getStreamingSafeContent(progress?.content || '').trim();
        const interruptedTrace = (progress?.trace || []).map((item) =>
          item.type === 'tool' && item.status === 'running'
            ? { ...item, status: 'error' as const, result: '已由用户终止' }
            : item,
        );
        appendMessage(conversationId, {
          role: 'assistant',
          content: partialContent
            ? `${partialContent}\n\n*已停止生成*`
            : '*已停止生成*',
          reasoning: interruptedTrace
            .filter((item) => item.type === 'reasoning')
            .map((item) => item.content)
            .join('\n\n'),
          trace: interruptedTrace,
          threads: progress?.threads || [],
          durationMs: Date.now() - startedAt,
        });
        setStatus('idle');
        toast.info('已停止生成');
      } else {
        setStatus('error');
        toast.error(error instanceof Error ? error.message : 'AI 搜索失败');
      }
    } finally {
      unregisterAISearchController(conversationId, controller);
      setConversationRunning(conversationId, false);
      const currentURL = new URL(window.location.href);
      const conversationIsVisible =
        currentURL.pathname === '/ai-search' &&
        currentURL.searchParams.get('conversation') === conversationId;
      if (conversationIsVisible) markConversationRead(conversationId);
      else markConversationUnread(conversationId);
      liveResponsesRef.current.delete(conversationId);
      setLiveResponse((current) => current?.conversationId === conversationId ? null : current);
    }
  };

  const handleStop = () => {
    if (activeConversationId) abortAISearchConversation(activeConversationId);
  };

  const handleQuestionAnswer = async (answer: string) => {
    const normalizedAnswer = answer.trim();
    if (!normalizedAnswer || !pendingQuestion || !activeConversationId || isRunning) return;
    const toolMessage: AISearchDisplayMessage = {
      role: 'tool',
      content: JSON.stringify({ answer: normalizedAnswer }),
      hidden: true,
      tool_call_id: pendingQuestion.toolCallId,
      createdAt: Date.now(),
    };
    appendMessage(activeConversationId, toolMessage);
    setCustomQuestionAnswer('');
    await executeTurn(activeConversationId, undefined, [...messages, toolMessage]);
  };

  const handleSubmit = async () => {
    const userMessage = input.trim();
    if (!userMessage || isRunning || pendingQuestion || !ensureModelConfigured()) return;

    const history = messages;
    const conversationId = activeConversationId || startConversation(userMessage);
    if (activeConversationId) {
      appendMessage(conversationId, { role: 'user', content: userMessage });
    } else {
      setSearchParams({ conversation: conversationId }, { replace: true });
    }
    setInput('');
    await executeTurn(conversationId, userMessage, history);
  };

  const handleRetry = async () => {
    if (
      isRunning ||
      !activeConversationId ||
      latestUserMessageIndex < 0 ||
      !ensureModelConfigured()
    ) return;

    const userMessage = messages[latestUserMessageIndex].content;
    const userMessageRecord = messages[latestUserMessageIndex];
    const history = messages.slice(0, latestUserMessageIndex);
    replaceMessages(activeConversationId, [...history, userMessageRecord]);
    setEditingMessageIndex(null);
    await executeTurn(activeConversationId, userMessage, history);
  };

  const handleConfirmEdit = async () => {
    const userMessage = editDraft.trim();
    if (
      !userMessage ||
      isRunning ||
      !activeConversationId ||
      editingMessageIndex !== latestUserMessageIndex ||
      !ensureModelConfigured()
    ) return;

    const history = messages.slice(0, editingMessageIndex);
    replaceMessages(
      activeConversationId,
      [...history, { role: 'user', content: userMessage, createdAt: Date.now() }],
      editingMessageIndex === 0 ? userMessage : undefined,
    );
    setEditingMessageIndex(null);
    setEditDraft('');
    await executeTurn(activeConversationId, userMessage, history);
  };

  const handleResponseTokenSelect = (token: AISearchInlineToken) => {
    setInput((current) => addToken(current, token.type, token.value));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const latestFollowupMessage = useMemo(() => {
    const lastVisibleMessage = [...messages].reverse().find((message) => !message.hidden);
    return lastVisibleMessage?.role === 'assistant' && lastVisibleMessage.followups?.length
      ? lastVisibleMessage as AISearchDisplayMessage & { followups: NonNullable<AISearchDisplayMessage['followups']> }
      : null;
  }, [messages]);

  const hideFollowupsLater = (delay = 5_000) => {
    if (followupTimerRef.current !== null) window.clearTimeout(followupTimerRef.current);
    followupTimerRef.current = window.setTimeout(() => setFollowupsVisible(false), delay);
  };

  useEffect(() => {
    if (followupTimerRef.current !== null) window.clearTimeout(followupTimerRef.current);
    if (isRunning || !latestFollowupMessage) {
      followupTimerRef.current = window.setTimeout(() => setFollowupsVisible(false), 0);
      return;
    }

    const key = `${activeConversationId || 'new'}:${latestFollowupMessage.createdAt || 0}`;
    if (shownFollowupKeyRef.current === key) return;
    shownFollowupKeyRef.current = key;
    const age = latestFollowupMessage.createdAt ? Date.now() - latestFollowupMessage.createdAt : 5_000;
    if (age >= 5_000) {
      followupTimerRef.current = window.setTimeout(() => setFollowupsVisible(false), 0);
      return;
    }

    followupTimerRef.current = window.setTimeout(() => {
      setFollowupsVisible(true);
      hideFollowupsLater(5_000 - age);
    }, 0);
    return () => {
      if (followupTimerRef.current !== null) window.clearTimeout(followupTimerRef.current);
    };
  }, [activeConversationId, isRunning, latestFollowupMessage]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pt-5 sm:px-8 lg:px-12">
      <header className="relative z-20 mx-auto flex w-full max-w-5xl shrink-0 justify-end">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              startNewConversation();
              setSearchParams({}, { replace: true });
              setStatus('idle');
              setLiveResponse(null);
              if (activeConversationId) liveResponsesRef.current.delete(activeConversationId);
              setInput('');
              setPlaceholderIndex((current) => (current + 1) % INPUT_PLACEHOLDERS.length);
            }}
            disabled={isRunning}
            className="group inline-flex h-9 w-9 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
            aria-label="新建对话"
          >
            <SquarePen className="h-4.5 w-4.5 transition-transform duration-200 group-hover:-rotate-6" />
          </button>
          <button
            type="button"
            onClick={openSettings}
            data-tour="ai-search-settings"
            className="group inline-flex h-9 w-9 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
            aria-label="模型设置"
          >
            <Settings className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-45" />
          </button>
        </div>
      </header>

      <section className="relative mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-visible py-4 sm:py-6">
        <motion.div
          layout
          className={`pointer-events-none z-10 flex flex-col items-center text-center ${messages.length === 0 ? 'h-full justify-center pb-6' : 'absolute inset-x-0 -top-12'}`}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        >
          <motion.img
            layout
            src={MASCOT_IMAGES[mascotEmotion[effectiveStatus]] || MASCOT_IMAGES.hi}
            alt="类脑娘正面对话立绘"
            className={`${messages.length === 0 ? 'h-52 w-52 sm:h-64 sm:w-64 lg:h-72 lg:w-72' : 'h-24 w-24 sm:h-30 sm:w-30'} object-contain drop-shadow-xl`}
            draggable={false}
          />
          <div className={`${messages.length === 0 ? 'mt-5' : 'mt-1'} max-w-xl space-y-2`}>
            <h1 className={`${messages.length === 0 ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'} ${isRunning ? 'animate-ai-text-shine bg-linear-to-r from-(--od-text-tertiary) via-(--od-text-heading) to-(--od-text-tertiary) bg-size-[200%_100%] bg-clip-text text-transparent' : 'text-(--od-text-heading)'} font-semibold tracking-tight`}>
              {messages.length === 0 ? '想找些什么？' : statusText[effectiveStatus] || '我把结果整理好啦'}
            </h1>
            {messages.length === 0 && (
              <p className="text-sm leading-7 text-(--od-text-secondary) sm:text-base">
                告诉我你想看的作品，我会尝试调整关键词、筛选候选内容，再把值得打开的结果整理给你。
              </p>
            )}
          </div>
        </motion.div>

        {messages.length > 0 && (
          <div
            ref={conversationScrollRef}
            className="scrollbar-invisible absolute inset-0 overflow-y-auto overscroll-contain"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, transparent 6.5rem, black 10rem, black 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0, transparent 6.5rem, black 10rem, black 100%)',
            }}
          >
            <div className="mx-auto w-full max-w-3xl space-y-10 pb-8 pt-40 text-left">
              {messages.map((message, index) => (
                message.hidden || message.role === 'tool' ? null : (
                <div
                  key={`${message.role}-${index}`}
                  className={`group flex flex-col space-y-2 ${message.role === 'user' ? 'ml-auto max-w-[85%] items-end text-right sm:max-w-[70%]' : 'items-start'}`}
                >
                  <div className={`flex items-center gap-1 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'user' &&
                      index === latestUserMessageIndex &&
                      editingMessageIndex !== index && (
                        <div className="flex items-center opacity-100 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageIndex(index);
                              setEditDraft(message.content);
                            }}
                            disabled={isRunning}
                            className="inline-flex h-7 w-7 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:opacity-40"
                            aria-label="编辑这条消息"
                            title="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    {message.role === 'user' && message.createdAt && (
                      <time className="text-[10px] font-normal tracking-normal text-(--od-text-tertiary)">
                        {formatAISearchTimestamp(message.createdAt)}
                      </time>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--od-text-tertiary)">
                      {message.role === 'user' ? '你' : '类脑娘'}
                    </p>
                  </div>
                  {message.role === 'user' ? (
                    editingMessageIndex === index ? (
                      <div className="w-full min-w-64 max-w-xl">
                        <AISearchTokenInput
                          value={editDraft}
                          onChange={setEditDraft}
                          onSubmit={() => void handleConfirmEdit()}
                          channels={mentionChannels}
                          autoFocus
                          rows={3}
                          className="w-full rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-2 py-1 text-left transition-colors focus-within:border-(--od-accent)"
                        />
                        <div className="mt-2 flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageIndex(null);
                              setEditDraft('');
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-text-primary)"
                            aria-label="取消编辑"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmEdit()}
                            disabled={!editDraft.trim() || isRunning}
                            className="inline-flex h-8 w-8 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:opacity-40"
                            aria-label="确认编辑并重新搜索"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <AISearchUserMessage content={message.content} channels={mentionChannels} />
                    )
                  ) : (
                    <>
                      <AISearchResponse
                        content={message.content}
                        reasoning={message.reasoning}
                        trace={message.trace}
                        threads={message.threads || []}
                        onPreview={openPreview}
                        channels={mentionChannels}
                        onTokenSelect={handleResponseTokenSelect}
                      />
                      {(message.createdAt || message.durationMs !== undefined || message.usage) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-(--od-text-tertiary)">
                          {message.createdAt && <time>{formatAISearchTimestamp(message.createdAt)}</time>}
                          {message.durationMs !== undefined && (
                            <span>耗时 {formatAISearchDuration(message.durationMs)}</span>
                          )}
                          {message.usage?.prompt_tokens !== undefined && (
                            <span>输入 {message.usage.prompt_tokens.toLocaleString()} tokens</span>
                          )}
                          {message.usage?.completion_tokens !== undefined && (
                            <span>输出 {message.usage.completion_tokens.toLocaleString()} tokens</span>
                          )}
                          {message.usage?.total_tokens !== undefined && (
                            <span>共 {message.usage.total_tokens.toLocaleString()} tokens</span>
                          )}
                        </div>
                      )}
                      {index === messages.length - 1 && (
                        <button
                          type="button"
                          onClick={() => void handleRetry()}
                          disabled={isRunning}
                          className="group/retry inline-flex items-center gap-1.5 text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:opacity-40"
                        >
                          <RefreshCw className="h-3.5 w-3.5 transition-transform duration-300 group-hover/retry:rotate-180" />
                          <span>重试</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
                )
              ))}
              {liveResponse?.conversationId === activeConversationId && (
                <div className="flex flex-col items-start space-y-2">
                  <div className="flex items-center gap-2 text-(--od-text-tertiary)">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">类脑娘</p>
                    <span className="text-[11px] font-normal tracking-normal">
                      已处理 {formatAISearchDuration(liveClock - liveResponse.startedAt)}
                    </span>
                  </div>
                  <AISearchResponse
                    content={liveResponse.content}
                    trace={liveResponse.trace}
                    threads={liveResponse.threads}
                    onPreview={openPreview}
                    channels={mentionChannels}
                    onTokenSelect={handleResponseTokenSelect}
                    isStreaming
                  />
                </div>
              )}
              {messages[messages.length - 1]?.role === 'user' &&
                !isRunning &&
                !liveResponse &&
                editingMessageIndex === null && (
                <div className="flex flex-col items-start space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--od-text-tertiary)">
                    类脑娘
                  </p>
                  <p className="text-sm text-(--od-text-tertiary)">这次没有得到可用回答。</p>
                  <button
                    type="button"
                    onClick={() => void handleRetry()}
                    className="group/retry inline-flex items-center gap-1.5 text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-accent)"
                  >
                    <RefreshCw className="h-3.5 w-3.5 transition-transform duration-300 group-hover/retry:rotate-180" />
                    <span>重试</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <form
        autoComplete="off"
        className="mx-auto w-full max-w-3xl shrink-0 pb-5 pt-2 sm:pb-7"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2 px-2">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => {
                  setInput(question);
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="text-xs leading-5 text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) sm:text-sm"
              >
                {question}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {pendingQuestion && !isRunning && (
            <motion.div
              key={pendingQuestion.toolCallId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="od-floating-panel-solid mb-2 rounded-2xl border border-(--od-shell-line) px-4 py-3 shadow-(--od-shadow-floating)"
            >
              <p className="text-sm font-medium leading-6 text-(--od-text-primary)">{pendingQuestion.question}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => void handleQuestionAnswer(option)}
                    className="rounded-full border border-(--od-shell-line) px-3 py-1.5 text-xs text-(--od-text-secondary) transition-colors hover:border-(--od-accent) hover:text-(--od-accent) sm:text-sm"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-(--od-shell-line) pt-3">
                <input
                  value={customQuestionAnswer}
                  onChange={(event) => setCustomQuestionAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void handleQuestionAnswer(customQuestionAnswer);
                    }
                  }}
                  placeholder="或者输入自己的回答"
                  maxLength={200}
                  className="min-w-0 flex-1 bg-transparent text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
                />
                <button
                  type="button"
                  onClick={() => void handleQuestionAnswer(customQuestionAnswer)}
                  disabled={!customQuestionAnswer.trim()}
                  className="text-xs font-medium text-(--od-accent) transition-opacity disabled:opacity-35"
                >
                  回答
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative">
          <AnimatePresence initial={false}>
            {latestFollowupMessage && !isRunning && followupsVisible && (
              <motion.div
                key="followups"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-0 bottom-[calc(100%+0.15rem)] z-20 pt-5"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 1.25rem, black 100%)',
                  maskImage: 'linear-gradient(to bottom, transparent 0, black 1.25rem, black 100%)',
                }}
              >
                <div className="scrollbar-invisible flex gap-3 overflow-x-auto px-2 pb-1">
                  {latestFollowupMessage.followups.map((followup) => (
                    <button
                      key={`${followup.direction}-${followup.text}`}
                      type="button"
                      onClick={() => {
                        setInput(followup.text);
                        setFollowupsVisible(false);
                        if (followupTimerRef.current !== null) window.clearTimeout(followupTimerRef.current);
                        window.requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                      className="min-w-[12rem] flex-1 px-2 py-2 text-center text-xs leading-5 text-(--od-text-secondary) transition-colors hover:text-(--od-accent) sm:text-sm"
                    >
                      {followup.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {latestFollowupMessage && !isRunning && !followupsVisible && (
            <button
              type="button"
              onClick={() => {
                setFollowupsVisible(true);
                hideFollowupsLater();
              }}
              className="absolute bottom-[calc(100%+0.15rem)] left-1/2 z-20 inline-flex h-6 w-8 -translate-x-1/2 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent)"
              aria-label="展开建议追问"
              title="展开建议追问"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}

          <div data-tour="ai-search-input" className={`od-floating-panel-solid flex items-end gap-2 rounded-[1.55rem] border border-(--od-shell-line) px-4 py-3 shadow-(--od-shadow-floating) ${pendingQuestion ? 'pointer-events-none opacity-45' : ''}`}>
          <AISearchTokenInput
            inputRef={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={() => void handleSubmit()}
            channels={mentionChannels}
            placeholder={INPUT_PLACEHOLDERS[placeholderIndex]}
            disabled={Boolean(pendingQuestion)}
          />
          <button
            type={isRunning ? 'button' : 'submit'}
            onClick={isRunning ? handleStop : undefined}
            disabled={!isRunning && (!input.trim() || Boolean(pendingQuestion))}
            className={`mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              isRunning
                ? 'border border-(--od-accent) bg-transparent text-(--od-accent)'
                : 'bg-(--od-accent) text-(--od-accent-text)'
            }`}
            aria-label={isRunning ? '停止生成' : '发送搜索需求'}
          >
            {isRunning ? (
              <Square className="h-3 w-3 fill-current" />
            ) : (
              <ArrowUp className="h-4.5 w-4.5" />
            )}
          </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-(--od-text-tertiary)">
          搜索摘要和少量候选首楼会发送到你配置的模型服务。结果来自类脑索引，实际内容以 Discord 为准。
        </p>
      </form>

      <dialog
        ref={settingsDialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="od-floating-panel-solid fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[1.7rem] border border-(--od-shell-line) p-0 text-(--od-text-primary) shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-xs"
      >
        <form
          autoComplete="off"
          data-form-type="other"
          className="p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            saveSettings();
          }}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--od-text-tertiary)">
                Model connection
              </p>
              <h2 className="mt-1 text-xl font-semibold text-(--od-text-heading)">模型与看板娘设置</h2>
            </div>
            <button
              type="button"
              onClick={() => settingsDialogRef.current?.close()}
              className="p-1.5 text-(--od-text-tertiary) transition-colors hover:text-(--od-text-primary)"
              aria-label="关闭设置"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div role="tablist" aria-label="模型设置分类" className="mb-6 flex gap-6 border-b border-(--od-shell-line)">
            {([
              ['api', 'API 配置'],
              ['prompt', '提示词'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={settingsTab === tab}
                onClick={() => setSettingsTab(tab)}
                className={`relative pb-2.5 text-sm font-medium transition-colors ${
                  settingsTab === tab
                    ? 'text-(--od-accent) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--od-accent)'
                    : 'text-(--od-text-tertiary) hover:text-(--od-text-primary)'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {settingsTab === 'api' ? (
            <div role="tabpanel" className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">API Base URL</span>
                <input
                  type="url"
                  name="odysseia-ai-provider-base-url"
                  autoComplete="off"
                  data-form-type="other"
                  value={draftSettings.baseUrl}
                  onChange={(event) => updateDraft('baseUrl', event.target.value)}
                  placeholder="https://example.com/v1"
                  className="w-full rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-3 py-2.5 text-sm outline-hidden transition-colors focus:border-(--od-accent)"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">API Key</span>
                  <input
                    type="password"
                    name="odysseia-ai-provider-api-key"
                    value={draftSettings.apiKey}
                    onChange={(event) => updateDraft('apiKey', event.target.value)}
                    placeholder="保存在当前浏览器"
                    autoComplete="new-password"
                    data-form-type="other"
                    data-1p-ignore
                    data-lpignore="true"
                    className="w-full rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-3 py-2.5 text-sm outline-hidden transition-colors focus:border-(--od-accent)"
                  />
                </label>
                <div className="space-y-2">
                  <span className="text-sm font-medium">可用模型</span>
                  <div className="flex gap-2">
                    <select
                      value={draftSettings.model}
                      onChange={(event) => updateDraft('model', event.target.value)}
                      disabled={modelIds.length === 0}
                      className="min-w-0 flex-1 rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-3 py-2.5 text-sm outline-hidden transition-colors focus:border-(--od-accent) disabled:text-(--od-text-tertiary)"
                      aria-label="选择模型"
                    >
                      {draftSettings.model && !modelIds.includes(draftSettings.model) && (
                        <option value={draftSettings.model}>{draftSettings.model}</option>
                      )}
                      {modelIds.length === 0 && !draftSettings.model && <option value="">先获取模型</option>}
                      {modelIds.map((modelId) => (
                        <option key={modelId} value={modelId}>{modelId}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleFetchModels}
                      disabled={isFetchingModels || !draftSettings.baseUrl.trim()}
                      className="inline-flex h-10.5 shrink-0 items-center gap-1.5 rounded-xl border border-(--od-shell-line) px-3 text-xs font-medium text-(--od-text-secondary) transition-colors hover:text-(--od-accent) disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                      {isFetchingModels ? '获取中' : '获取模型'}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-5 text-(--od-warning)">
                API Key 会保存在这个浏览器的 Local Storage 中，请不要在公共设备上启用。
              </p>

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draftSettings.sendClientHeader}
                  onChange={(event) => updateDraft('sendClientHeader', event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-(--od-accent)"
                />
                <span>
                  <span className="font-medium">发送应用标识 Header</span>
                  <span className="mt-1 block text-xs leading-5 text-(--od-text-tertiary)">
                    使用 X-Client-Name: odysseia-forum-webpage；若模型服务不允许该 CORS Header，可以关闭。
                  </span>
                </span>
              </label>
            </div>
          ) : (
            <div role="tabpanel" className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">当前动态上下文</span>
                <textarea
                  value={context}
                  readOnly
                  rows={8}
                  className="w-full resize-y rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-3 py-2.5 font-mono text-xs leading-5 text-(--od-text-secondary) outline-hidden"
                />
                <span className="block text-xs leading-5 text-(--od-text-tertiary)">
                  来自当前账号偏好和频道 Tag 目录；发送时动态附加到 System 消息，不会写入本地设置。
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">用户喜好</span>
                <textarea
                  value={draftSettings.userTaste}
                  onChange={(event) => updateDraft('userTaste', event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="例如：偏爱温暖日常、细腻关系和有完整背景设定的角色卡。"
                  className="w-full resize-y rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-3 py-2.5 text-sm leading-6 outline-hidden transition-colors focus:border-(--od-accent)"
                />
                <span className="flex items-start justify-between gap-3 text-xs leading-5 text-(--od-text-tertiary)">
                  <span>作为语义推荐倾向注入，不会自动变成频道、Tag 或排除条件。</span>
                  <span className="shrink-0">{draftSettings.userTaste.length}/2000</span>
                </span>
              </label>

              <label className="block space-y-2">
                <span className="flex items-center justify-between gap-3 text-sm font-medium">
                  看板娘系统提示词
                  <button
                    type="button"
                    onClick={() => updateDraft('systemPrompt', DEFAULT_AI_SEARCH_SYSTEM_PROMPT)}
                    className="inline-flex items-center gap-1 text-xs font-normal text-(--od-text-tertiary) transition-colors hover:text-(--od-accent)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    恢复默认
                  </button>
                </span>
                <textarea
                  value={draftSettings.systemPrompt}
                  onChange={(event) => updateDraft('systemPrompt', event.target.value)}
                  maxLength={4000}
                  rows={7}
                  className="w-full resize-y rounded-xl border border-(--od-shell-line) bg-(--od-surface-input) px-3 py-2.5 text-sm leading-6 outline-hidden transition-colors focus:border-(--od-accent)"
                />
                <span className="block text-right text-[11px] text-(--od-text-tertiary)">
                  {draftSettings.systemPrompt.length}/4000
                </span>
              </label>
            </div>
          )}

          <div className="mt-7 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => settingsDialogRef.current?.close()}
              className="px-4 py-2 text-sm text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary)"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-full bg-(--od-accent) px-5 py-2 text-sm font-medium text-(--od-accent-text) transition-opacity hover:opacity-90"
            >
              保存设置
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
