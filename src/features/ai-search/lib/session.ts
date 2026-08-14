import { z } from 'zod';
import { create } from 'zustand';

import type { Thread } from '@/entities/thread/types';
import type { AISearchFollowup } from '@/features/ai-search/lib/responseParser';
import type { AISearchToolCall } from '@/features/ai-search/lib/tools';

export const AI_SEARCH_SESSION_KEY = 'odysseia_ai_search_session_v1';
export const AI_SEARCH_CONVERSATIONS_KEY = 'odysseia_ai_search_conversations_v1';

export interface AISearchReasoningTraceItem {
  type: 'reasoning';
  content: string;
}

export interface AISearchTextTraceItem {
  type: 'text';
  content: string;
}

export interface AISearchToolTraceItem {
  type: 'tool';
  id: string;
  tool: 'search_threads' | 'search_tournaments' | 'draw_threads' | 'get_thread_details' | 'get_resource_details' | 'ask_user';
  label: string;
  status: 'running' | 'complete' | 'error';
  parameters: string;
  result?: string;
}

export type AISearchTraceItem = AISearchReasoningTraceItem | AISearchTextTraceItem | AISearchToolTraceItem;

export interface AISearchUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AISearchDrawBatch {
  configuration: string;
  threads: Thread[];
}

export interface AISearchDisplayMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  hidden?: boolean;
  tool_call_id?: string;
  tool_calls?: AISearchToolCall[];
  reasoning_content?: string;
  createdAt?: number;
  durationMs?: number;
  usage?: AISearchUsage;
  reasoning?: string;
  trace?: AISearchTraceItem[];
  threads?: Thread[];
  draws?: AISearchDrawBatch[];
  followups?: AISearchFollowup[];
}

export interface AISearchConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AISearchDisplayMessage[];
}

interface AISearchConversationState {
  activeConversationId: string | null;
  conversations: AISearchConversation[];
  unreadConversationIds: string[];
  runningConversationIds: string[];
  startConversation: (userMessage: string) => string;
  appendMessage: (conversationId: string, message: AISearchDisplayMessage) => void;
  appendMessages: (conversationId: string, messages: AISearchDisplayMessage[]) => void;
  replaceMessages: (
    conversationId: string,
    messages: AISearchDisplayMessage[],
    title?: string,
  ) => void;
  selectConversation: (conversationId: string) => void;
  startNewConversation: () => void;
  markConversationUnread: (conversationId: string) => void;
  markConversationRead: (conversationId: string) => void;
  setConversationRunning: (conversationId: string, running: boolean) => void;
}

const threadSchema = z.object({
  thread_id: z.string(),
  channel_id: z.string(),
  title: z.string(),
  created_at: z.string(),
  reaction_count: z.number(),
  reply_count: z.number(),
  thumbnail_urls: z.array(z.string()),
  tags: z.array(z.string()),
}).passthrough();

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string().max(100_000),
  hidden: z.boolean().optional(),
  tool_call_id: z.string().max(200).optional(),
  tool_calls: z.array(z.object({
    id: z.string().max(200),
    type: z.literal('function'),
    function: z.object({
      name: z.string().max(100),
      arguments: z.string().max(20_000),
    }),
  })).max(8).optional(),
  reasoning_content: z.string().max(100_000).optional(),
  createdAt: z.number().nonnegative().optional(),
  durationMs: z.number().nonnegative().max(86_400_000).optional(),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
  }).optional(),
  reasoning: z.string().max(100_000).optional(),
  trace: z.array(z.discriminatedUnion('type', [
    z.object({
      type: z.literal('reasoning'),
      content: z.string().max(100_000),
    }),
    z.object({
      type: z.literal('text'),
      content: z.string().max(100_000),
    }),
    z.object({
      type: z.literal('tool'),
      id: z.string().max(200),
      tool: z.enum(['search_threads', 'search_tournaments', 'draw_threads', 'get_thread_details', 'get_resource_details', 'ask_user']),
      label: z.string().max(100),
      status: z.enum(['running', 'complete', 'error']),
      parameters: z.string().max(2_000),
      result: z.string().max(500).optional(),
    }),
  ])).max(32).optional(),
  threads: z.array(threadSchema).max(36).optional(),
  draws: z.array(z.object({
    configuration: z.string().max(2_000),
    threads: z.array(threadSchema).max(10),
  })).max(2).optional(),
  followups: z.array(z.object({
    direction: z.enum(['broader', 'narrower', 'alternate']),
    text: z.string().min(1).max(80),
  }).strict()).max(3).optional(),
});

const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  createdAt: z.number(),
  updatedAt: z.number(),
  messages: z.array(messageSchema).max(48),
});

const storedStateSchema = z.object({
  activeConversationId: z.string().nullable(),
  conversations: z.array(conversationSchema).max(5),
  unreadConversationIds: z.array(z.string()).max(5).default([]),
});

interface StoredConversationState {
  activeConversationId: string | null;
  conversations: AISearchConversation[];
  unreadConversationIds: string[];
}

const emptyState: StoredConversationState = {
  activeConversationId: null,
  conversations: [],
  unreadConversationIds: [],
};

const runningControllers = new Map<string, AbortController>();

export function registerAISearchController(conversationId: string, controller: AbortController) {
  if (runningControllers.has(conversationId)) return false;
  runningControllers.set(conversationId, controller);
  return true;
}

export function unregisterAISearchController(conversationId: string, controller: AbortController) {
  if (runningControllers.get(conversationId) === controller) runningControllers.delete(conversationId);
}

export function abortAISearchConversation(conversationId: string) {
  runningControllers.get(conversationId)?.abort();
}

function createConversationId() {
  return globalThis.crypto?.randomUUID?.() || `ai-search-${Date.now()}`;
}

function trimConversationMessages(messages: AISearchDisplayMessage[]) {
  if (messages.length <= 48) return messages;
  const tail = messages.slice(-48);
  const firstCompleteTurn = tail.findIndex((message) => message.role === 'user');
  return firstCompleteTurn >= 0 ? tail.slice(firstCompleteTurn) : [];
}

export function createConversationTitle(message: string) {
  return message
    .replace(/\$(tag|author|channel):([^$]+)\$/g, (_, type: string, value: string) =>
      type === 'tag' ? value : `${type === 'author' ? '作者' : '频道'} ${value}`,
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24) || '新对话';
}

export function loadAISearchConversationState(): StoredConversationState {
  if (typeof window === 'undefined') return emptyState;

  try {
    const stored = window.localStorage.getItem(AI_SEARCH_CONVERSATIONS_KEY);
    if (stored) {
      const parsed = storedStateSchema.parse(JSON.parse(stored)) as StoredConversationState;
      const conversationIds = new Set(parsed.conversations.map((conversation) => conversation.id));
      return {
        ...parsed,
        unreadConversationIds: parsed.unreadConversationIds.filter((id) => conversationIds.has(id)),
      };
    }

    const legacyMessages = z.array(messageSchema).max(48).parse(
      JSON.parse(window.localStorage.getItem(AI_SEARCH_SESSION_KEY) || '[]'),
    ) as AISearchDisplayMessage[];
    if (legacyMessages.length === 0) return emptyState;

    const now = Date.now();
    const conversation: AISearchConversation = {
      id: createConversationId(),
      title: createConversationTitle(
        legacyMessages.find((message) => message.role === 'user')?.content || '历史对话',
      ),
      createdAt: now,
      updatedAt: now,
      messages: legacyMessages,
    };
    const migrated = {
      activeConversationId: conversation.id,
      conversations: [conversation],
      unreadConversationIds: [],
    };
    window.localStorage.setItem(AI_SEARCH_CONVERSATIONS_KEY, JSON.stringify(migrated));
    window.localStorage.removeItem(AI_SEARCH_SESSION_KEY);
    return migrated;
  } catch {
    window.localStorage.removeItem(AI_SEARCH_CONVERSATIONS_KEY);
    window.localStorage.removeItem(AI_SEARCH_SESSION_KEY);
    return emptyState;
  }
}

function saveAISearchConversationState(state: StoredConversationState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AI_SEARCH_CONVERSATIONS_KEY, JSON.stringify(state));
  } catch {
    // Local Storage 配额不足时保留当前内存会话，不影响继续搜索。
  }
}

const initialState = loadAISearchConversationState();

export const useAISearchConversationStore = create<AISearchConversationState>((set, get) => {
  const update = (
    next: Omit<StoredConversationState, 'unreadConversationIds'> &
      Partial<Pick<StoredConversationState, 'unreadConversationIds'>>,
  ) => {
    const stored = {
      ...next,
      unreadConversationIds: next.unreadConversationIds ?? get().unreadConversationIds,
    };
    set(stored);
    saveAISearchConversationState(stored);
  };

  return {
    ...initialState,
    runningConversationIds: [],
    startConversation: (userMessage) => {
      const now = Date.now();
      const conversation: AISearchConversation = {
        id: createConversationId(),
        title: createConversationTitle(userMessage),
        createdAt: now,
        updatedAt: now,
        messages: [{ role: 'user', content: userMessage, createdAt: now }],
      };
      const conversations = [conversation, ...get().conversations].slice(0, 5);
      const conversationIds = new Set(conversations.map((item) => item.id));
      update({
        activeConversationId: conversation.id,
        conversations,
        unreadConversationIds: get().unreadConversationIds.filter((id) => conversationIds.has(id)),
      });
      return conversation.id;
    },
    appendMessage: (conversationId, message) => {
      const conversation = get().conversations.find((item) => item.id === conversationId);
      if (!conversation) return;

      const updated = {
        ...conversation,
        updatedAt: Date.now(),
        messages: trimConversationMessages([
          ...conversation.messages,
          { ...message, createdAt: message.createdAt ?? Date.now() },
        ]),
      };
      update({
        activeConversationId: get().activeConversationId,
        conversations: [updated, ...get().conversations.filter((item) => item.id !== conversationId)].slice(0, 5),
      });
    },
    appendMessages: (conversationId, messages) => {
      const conversation = get().conversations.find((item) => item.id === conversationId);
      if (!conversation || messages.length === 0) return;

      const now = Date.now();
      const updated = {
        ...conversation,
        updatedAt: now,
        messages: trimConversationMessages([
          ...conversation.messages,
          ...messages.map((message) => ({
            ...message,
            createdAt: message.createdAt ?? now,
          })),
        ]),
      };
      update({
        activeConversationId: get().activeConversationId,
        conversations: [updated, ...get().conversations.filter((item) => item.id !== conversationId)].slice(0, 5),
      });
    },
    replaceMessages: (conversationId, messages, title) => {
      const conversation = get().conversations.find((item) => item.id === conversationId);
      if (!conversation) return;

      const updated = {
        ...conversation,
        title: title ? createConversationTitle(title) : conversation.title,
        updatedAt: Date.now(),
        messages: trimConversationMessages(messages),
      };
      update({
        activeConversationId: get().activeConversationId,
        conversations: [updated, ...get().conversations.filter((item) => item.id !== conversationId)].slice(0, 5),
      });
    },
    selectConversation: (conversationId) => {
      if (!get().conversations.some((item) => item.id === conversationId)) return;
      update({
        activeConversationId: conversationId,
        conversations: get().conversations,
        unreadConversationIds: get().unreadConversationIds.filter((id) => id !== conversationId),
      });
    },
    startNewConversation: () => {
      update({ activeConversationId: null, conversations: get().conversations });
    },
    markConversationUnread: (conversationId) => {
      if (get().unreadConversationIds.includes(conversationId)) return;
      update({
        activeConversationId: get().activeConversationId,
        conversations: get().conversations,
        unreadConversationIds: [...get().unreadConversationIds, conversationId].slice(-5),
      });
    },
    markConversationRead: (conversationId) => {
      if (!get().unreadConversationIds.includes(conversationId)) return;
      update({
        activeConversationId: get().activeConversationId,
        conversations: get().conversations,
        unreadConversationIds: get().unreadConversationIds.filter((id) => id !== conversationId),
      });
    },
    setConversationRunning: (conversationId, running) => {
      set((state) => ({
        runningConversationIds: running
          ? Array.from(new Set([...state.runningConversationIds, conversationId]))
          : state.runningConversationIds.filter((id) => id !== conversationId),
      }));
    },
  };
});
