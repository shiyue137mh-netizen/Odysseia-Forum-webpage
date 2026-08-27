import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_SEARCH_CONVERSATIONS_KEY,
  AI_SEARCH_MAX_MESSAGE_LENGTH,
  AI_SEARCH_SESSION_KEY,
  abortAISearchConversation,
  createConversationTitle,
  loadAISearchConversationState,
  registerAISearchController,
  unregisterAISearchController,
} from './session';

describe('AI 搜索会话历史', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('使用第一条用户消息生成精简标题', () => {
    expect(createConversationTitle('  帮我找\n最近很火的角色卡  ')).toBe('帮我找 最近很火的角色卡');
  });

  it('会把输入 Token 转成可读标题', () => {
    expect(createConversationTitle('$tag:角色卡$ $author:123$ 帮我找作品')).toBe(
      '角色卡 作者 123 帮我找作品',
    );
  });

  it('把旧单会话迁移成第一条历史', () => {
    window.localStorage.setItem(
      AI_SEARCH_SESSION_KEY,
      JSON.stringify([{ role: 'user', content: '找角色卡' }]),
    );

    const state = loadAISearchConversationState();
    expect(state.conversations[0]?.title).toBe('找角色卡');
    expect(state.conversations[0]?.messages).toEqual([{ role: 'user', content: '找角色卡' }]);
    expect(window.localStorage.getItem(AI_SEARCH_SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(AI_SEARCH_CONVERSATIONS_KEY)).not.toBeNull();
  });

  it('损坏数据会被清理', () => {
    window.localStorage.setItem(AI_SEARCH_CONVERSATIONS_KEY, '{');
    expect(loadAISearchConversationState()).toEqual({
      activeConversationId: null,
      conversations: [],
      unreadConversationIds: [],
    });
    expect(window.localStorage.getItem(AI_SEARCH_CONVERSATIONS_KEY)).toBeNull();
  });

  it('只隔离超长消息所在会话并保留其他历史', () => {
    window.localStorage.setItem(AI_SEARCH_CONVERSATIONS_KEY, JSON.stringify({
      activeConversationId: 'broken',
      unreadConversationIds: ['broken', 'healthy'],
      conversations: [
        {
          id: 'broken',
          title: '损坏会话',
          createdAt: 1,
          updatedAt: 2,
          messages: [{ role: 'user', content: 'x'.repeat(AI_SEARCH_MAX_MESSAGE_LENGTH + 1) }],
        },
        {
          id: 'healthy',
          title: '正常会话',
          createdAt: 3,
          updatedAt: 4,
          messages: [{ role: 'user', content: '保留我' }],
        },
      ],
    }));

    const state = loadAISearchConversationState();

    expect(state.activeConversationId).toBe('healthy');
    expect(state.conversations.map((conversation) => conversation.id)).toEqual(['healthy']);
    expect(state.unreadConversationIds).toEqual(['healthy']);
  });

  it('恢复 Assistant 消息中的快捷追问', () => {
    window.localStorage.setItem(AI_SEARCH_CONVERSATIONS_KEY, JSON.stringify({
      activeConversationId: 'conversation-1',
      unreadConversationIds: [],
      conversations: [{
        id: 'conversation-1',
        title: '找角色卡',
        createdAt: 1,
        updatedAt: 2,
        messages: [{
          role: 'assistant',
          content: '整理结果',
          followups: [
            { direction: 'broader', text: '放宽条件' },
            { direction: 'narrower', text: '收紧条件' },
            { direction: 'alternate', text: '换个方向' },
          ],
        }],
      }],
    }));

    expect(loadAISearchConversationState().conversations[0]?.messages[0]?.followups).toHaveLength(3);
  });

  it('恢复工具续轮的原始思考内容与抽卡轨道', () => {
    const thread = {
      thread_id: '12345678901234567',
      channel_id: '22345678901234567',
      title: '随机作品',
      created_at: '2026-08-11T00:00:00Z',
      reaction_count: 1,
      reply_count: 2,
      thumbnail_urls: [],
      tags: [],
    };
    window.localStorage.setItem(AI_SEARCH_CONVERSATIONS_KEY, JSON.stringify({
      activeConversationId: 'conversation-1',
      unreadConversationIds: [],
      conversations: [{
        id: 'conversation-1',
        title: '抽一张卡',
        createdAt: 1,
        updatedAt: 2,
        messages: [{
          role: 'assistant',
          content: '',
          hidden: true,
          reasoning_content: '先按偏好卡池抽取',
          tool_calls: [{
            id: 'draw-1',
            type: 'function',
            function: { name: 'draw_threads', arguments: '{"count":1}' },
          }],
          draws: [{ configuration: '1 抽 · 偏好卡池', threads: [thread] }],
        }],
      }],
    }));

    const message = loadAISearchConversationState().conversations[0]?.messages[0];
    expect(message?.reasoning_content).toBe('先按偏好卡池抽取');
    expect(message?.draws?.[0]?.threads[0]?.thread_id).toBe(thread.thread_id);
  });

  it('允许跨页面通过会话 ID 终止运行中的请求', () => {
    const controller = new AbortController();
    expect(registerAISearchController('conversation-1', controller)).toBe(true);

    abortAISearchConversation('conversation-1');
    expect(controller.signal.aborted).toBe(true);

    unregisterAISearchController('conversation-1', controller);
  });

  it('拒绝同一会话同时登记第二个请求', () => {
    const first = new AbortController();
    const second = new AbortController();

    expect(registerAISearchController('conversation-2', first)).toBe(true);
    expect(registerAISearchController('conversation-2', second)).toBe(false);

    abortAISearchConversation('conversation-2');
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    unregisterAISearchController('conversation-2', first);
  });
});
