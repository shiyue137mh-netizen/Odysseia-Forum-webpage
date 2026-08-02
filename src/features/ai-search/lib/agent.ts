import {
  createChatCompletion,
  type ChatMessage,
  type ChatTokenUsage,
} from '@/features/ai-search/api/chatCompletionsApi';
import type { Thread } from '@/entities/thread/types';
import { buildAISearchSystemMessage } from '@/features/ai-search/lib/prompt';
import { extractAISearchFollowups } from '@/features/ai-search/lib/responseParser';
import type {
  AISearchDisplayMessage,
  AISearchToolTraceItem,
  AISearchTraceItem,
} from '@/features/ai-search/lib/session';
import {
  AI_SEARCH_TOOLS,
  createAISearchToolRuntime,
  parseAISearchAskUserCall,
  type AISearchStatus,
} from '@/features/ai-search/lib/tools';

export interface AISearchAgentProgress {
  content: string;
  trace: AISearchTraceItem[];
  threads: Thread[];
}

function collectHistoryThreads(history: AISearchDisplayMessage[]) {
  const threads = new Map<string, Thread>();
  for (const message of history) {
    for (const thread of message.threads || []) {
      threads.delete(thread.thread_id);
      threads.set(thread.thread_id, thread);
    }
  }
  return Array.from(threads.values()).slice(-36);
}

function collectHistoryResourceIds(history: AISearchDisplayMessage[]) {
  const threadIds = new Set<string>();
  const tournamentIds = new Set<string>();
  for (const message of history) {
    if (message.role !== 'tool') continue;
    try {
      const payload = JSON.parse(message.content) as { results?: Array<Record<string, unknown>> };
      for (const result of payload.results || []) {
        if (typeof result.thread_id === 'string') threadIds.add(result.thread_id);
        if (typeof result.tournament_id === 'string') tournamentIds.add(result.tournament_id);
      }
    } catch {
      // 损坏或非 JSON 的历史工具消息不参与详情授权。
    }
  }
  return { threadIds: Array.from(threadIds), tournamentIds: Array.from(tournamentIds) };
}

function hasAskUserSinceLatestUser(history: AISearchDisplayMessage[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (message.role === 'user') return false;
    if (message.tool_calls?.some((toolCall) => toolCall.function.name === 'ask_user')) return true;
  }
  return false;
}

export function buildAISearchSessionHistory(history: AISearchDisplayMessage[]): ChatMessage[] {
  return history.map((message) => ({
    role: message.role,
    content:
      message.role === 'assistant' && message.tool_calls?.length && !message.content
        ? null
        : message.content,
    tool_call_id: message.tool_call_id,
    tool_calls: message.tool_calls,
  }));
}

export async function runAISearchAgent({
  baseUrl,
  apiKey,
  model,
  sendClientHeader,
  systemPrompt,
  context,
  userTaste,
  userMessage,
  history = [],
  onStatus,
  onProgress,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  sendClientHeader: boolean;
  systemPrompt: string;
  context: string;
  userTaste: string;
  userMessage?: string;
  history?: AISearchDisplayMessage[];
  onStatus: (status: AISearchStatus) => void;
  onProgress?: (progress: AISearchAgentProgress) => void;
  signal?: AbortSignal;
}) {
  const sessionHistory = buildAISearchSessionHistory(history);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildAISearchSystemMessage(systemPrompt, context, userTaste) },
    ...sessionHistory,
    ...(userMessage?.trim() ? [{ role: 'user' as const, content: userMessage.trim() }] : []),
  ];
  const existingThreads = collectHistoryThreads(history);
  const existingResourceIds = collectHistoryResourceIds(history);
  const askAlreadyUsed = !userMessage?.trim() && hasAskUserSinceLatestUser(history);
  const trace: AISearchTraceItem[] = [];
  const turnMessages: AISearchDisplayMessage[] = [];
  const usage: ChatTokenUsage = {};
  let hasUsage = false;
  let displayContent = '';
  const emitProgress = () => {
    onProgress?.({
      content: displayContent,
      trace: trace.map((item) => ({ ...item })),
      threads: runtime?.getThreads() || existingThreads,
    });
  };
  const appendReasoning = (delta: string) => {
    if (!delta) return;
    const last = trace[trace.length - 1];
    if (last?.type === 'reasoning') {
      last.content = `${last.content}${delta}`.slice(0, 100_000);
    } else {
      trace.push({ type: 'reasoning', content: delta.slice(0, 100_000) });
    }
    emitProgress();
  };
  const updateToolTrace = (item: AISearchToolTraceItem) => {
    const index = trace.findIndex((current) => current.type === 'tool' && current.id === item.id);
    if (index >= 0) trace[index] = item;
    else trace.push(item);
    emitProgress();
  };

  const runtime = createAISearchToolRuntime(
    onStatus,
    existingThreads,
    updateToolTrace,
    signal,
    existingResourceIds,
  );

  for (let step = 0; step < 8; step += 1) {
    signal?.throwIfAborted();
    onStatus('thinking');
    let stepContent = '';
    const assistant = await createChatCompletion({
      baseUrl,
      apiKey,
      model,
      sendClientHeader,
      messages,
      tools: AI_SEARCH_TOOLS,
      onContentDelta: (delta) => {
        stepContent += delta;
        displayContent = stepContent;
        emitProgress();
      },
      onReasoningDelta: appendReasoning,
      signal,
    });
    messages.push({
      role: assistant.role,
      content: assistant.content,
      tool_calls: assistant.tool_calls,
      reasoning_content: assistant.reasoning_content,
    });
    if (assistant.tool_calls?.length) {
      turnMessages.push({
        role: 'assistant',
        content: assistant.content || '',
        hidden: true,
        tool_calls: assistant.tool_calls,
      });
    }
    if (assistant.usage) {
      hasUsage = true;
      if (assistant.usage.prompt_tokens !== undefined) {
        usage.prompt_tokens = (usage.prompt_tokens || 0) + assistant.usage.prompt_tokens;
      }
      if (assistant.usage.completion_tokens !== undefined) {
        usage.completion_tokens = (usage.completion_tokens || 0) + assistant.usage.completion_tokens;
      }
      if (assistant.usage.total_tokens !== undefined) {
        usage.total_tokens = (usage.total_tokens || 0) + assistant.usage.total_tokens;
      }
    }

    const askUserCall = assistant.tool_calls?.find((toolCall) => toolCall.function.name === 'ask_user');
    if (askUserCall && assistant.tool_calls?.length === 1 && !askAlreadyUsed) {
      try {
        const pendingQuestion = parseAISearchAskUserCall(askUserCall);
        onStatus('complete');
        return {
          answer: null,
          pendingQuestion,
          reasoning: trace
            .filter((item) => item.type === 'reasoning')
            .map((item) => item.content.trim())
            .filter(Boolean)
            .join('\n\n'),
          trace,
          threads: runtime.getThreads(),
          usage: hasUsage ? usage : undefined,
          followups: [],
          turnMessages,
        };
      } catch {
        // 非法参数交给统一工具错误路径反馈给模型，让它有机会自行修正。
      }
    }

    if (!assistant.tool_calls?.length) {
      let answer = assistant.content?.trim();
      if (!answer) throw new Error('模型没有返回可显示的回答');
      answer = answer.replace(/<think>\s*([\s\S]*?)\s*<\/think>/gi, (_match, reasoning: string) => {
        if (reasoning.trim()) appendReasoning(reasoning.trim());
        return '';
      }).trim();
      const parsedResponse = extractAISearchFollowups(answer);
      answer = parsedResponse.content;
      if (!answer) throw new Error('模型只返回了思考过程，没有最终回答');
      displayContent = answer;
      emitProgress();
      onStatus('complete');
      return {
        answer,
        pendingQuestion: null,
        reasoning: trace
          .filter((item) => item.type === 'reasoning')
          .map((item) => item.content.trim())
          .filter(Boolean)
          .join('\n\n'),
        trace,
        threads: runtime.getThreads(),
        usage: hasUsage ? usage : undefined,
        followups: parsedResponse.followups,
        turnMessages,
      };
    }

    displayContent = '';
    emitProgress();

    for (const toolCall of assistant.tool_calls) {
      let content: string;
      try {
        signal?.throwIfAborted();
        content = await runtime.execute(toolCall);
      } catch (error) {
        if (signal?.aborted) throw error;
        const errorMessage = error instanceof Error ? error.message : '工具执行失败';
        const existing = trace.find(
          (item): item is AISearchToolTraceItem => item.type === 'tool' && item.id === toolCall.id,
        );
          updateToolTrace({
          type: 'tool',
          id: toolCall.id,
          tool: toolCall.function.name === 'search_tournaments'
            ? 'search_tournaments'
            : toolCall.function.name === 'get_resource_details' || toolCall.function.name === 'get_thread_details'
              ? 'get_resource_details'
              : toolCall.function.name === 'ask_user'
                ? 'ask_user'
                : 'search_threads',
          label: existing?.label || (toolCall.function.name === 'search_tournaments'
            ? '搜索赛事'
            : toolCall.function.name === 'ask_user'
              ? '询问用户'
              : toolCall.function.name.includes('details') ? '读取详情' : '搜索'),
          status: 'error',
          parameters: existing?.parameters || '参数校验失败',
          result: errorMessage,
        });
        content = JSON.stringify({
          ok: false,
          tool: toolCall.function.name,
          error: errorMessage,
          ...(toolCall.function.name === 'ask_user' ? {
            expected_arguments: {
              question: '1 至 120 个字符的字符串',
              options: '2 至 3 个互不重复、每项 1 至 60 个字符的字符串数组',
            },
          } : {}),
        });
      }
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content });
      turnMessages.push({
        role: 'tool',
        content,
        hidden: true,
        tool_call_id: toolCall.id,
      });
    }
  }

  throw new Error('搜索步骤过多，请缩小需求后重试');
}
