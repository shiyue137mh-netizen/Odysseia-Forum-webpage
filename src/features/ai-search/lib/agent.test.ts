import { describe, expect, it, vi } from 'vitest';

import { createChatCompletion } from '@/features/ai-search/api/chatCompletionsApi';
import { buildAISearchSessionHistory, runAISearchAgent } from './agent';

vi.mock('@/features/ai-search/api/chatCompletionsApi', () => ({
  createChatCompletion: vi.fn(),
}));

describe('AI 搜索会话 Payload', () => {
  it('保留隐藏工具调用与工具结果，但不发送 UI 思考轨迹', () => {
    const history = buildAISearchSessionHistory([
      { role: 'user', content: '找母女角色卡' },
      {
        role: 'assistant',
        content: '',
        hidden: true,
        tool_calls: [{
          id: 'call-1',
          type: 'function',
          function: { name: 'search_threads', arguments: '{"keywords":"母女"}' },
        }],
      },
      {
        role: 'tool',
        content: '{"total":1,"results":[{"thread_id":"123"}]}',
        hidden: true,
        tool_call_id: 'call-1',
      },
      {
        role: 'assistant',
        content: '找到了一个候选。',
        reasoning: '这段只用于界面展示',
        trace: [{ type: 'reasoning', content: '隐藏思考' }],
      },
    ]);

    expect(history).toEqual([
      { role: 'user', content: '找母女角色卡', tool_call_id: undefined, tool_calls: undefined },
      {
        role: 'assistant',
        content: null,
        tool_call_id: undefined,
        tool_calls: [{
          id: 'call-1',
          type: 'function',
          function: { name: 'search_threads', arguments: '{"keywords":"母女"}' },
        }],
      },
      {
        role: 'tool',
        content: '{"total":1,"results":[{"thread_id":"123"}]}',
        tool_call_id: 'call-1',
        tool_calls: undefined,
      },
      {
        role: 'assistant',
        content: '找到了一个候选。',
        tool_call_id: undefined,
        tool_calls: undefined,
      },
    ]);
  });

  it('把非法 ask_user 参数作为工具错误反馈给模型修正', async () => {
    let secondRequestMessages: Parameters<typeof createChatCompletion>[0]['messages'] = [];
    vi.mocked(createChatCompletion)
      .mockResolvedValueOnce({
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'ask-invalid',
          type: 'function',
          function: { name: 'ask_user', arguments: '{"question":"想看哪类？","options":["剧情"]}' },
        }],
        reasoning_content: undefined,
        usage: undefined,
      })
      .mockImplementationOnce(async (request) => {
        secondRequestMessages = structuredClone(request.messages);
        return {
          role: 'assistant',
          content: '我先按剧情方向搜索。',
          tool_calls: undefined,
          reasoning_content: undefined,
          usage: undefined,
        };
      });

    const result = await runAISearchAgent({
      baseUrl: 'https://example.com/v1',
      apiKey: '',
      model: 'test-model',
      sendClientHeader: false,
      systemPrompt: '测试提示词',
      context: '测试上下文',
      userTaste: '',
      userMessage: '帮我找点东西',
      onStatus: () => undefined,
    });

    expect(result.answer).toBe('我先按剧情方向搜索。');
    expect(result.pendingQuestion).toBeNull();
    expect(secondRequestMessages[secondRequestMessages.length - 1]).toEqual({
      role: 'tool',
      tool_call_id: 'ask-invalid',
      content: expect.stringContaining('expected_arguments'),
    });
    expect(secondRequestMessages[secondRequestMessages.length - 1]?.content).toContain('ask_user 参数无效');
  });

  it('合法 ask_user 调用会暂停并返回待回答问题', async () => {
    vi.mocked(createChatCompletion).mockResolvedValueOnce({
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'ask-valid',
        type: 'function',
        function: {
          name: 'ask_user',
          arguments: '{"question":"更想看哪种方向？","options":["剧情向","互动向"]}',
        },
      }],
      reasoning_content: undefined,
      usage: undefined,
    });

    const result = await runAISearchAgent({
      baseUrl: 'https://example.com/v1',
      apiKey: '',
      model: 'test-model',
      sendClientHeader: false,
      systemPrompt: '测试提示词',
      context: '测试上下文',
      userTaste: '',
      userMessage: '帮我测试询问工具',
      onStatus: () => undefined,
    });

    expect(result.answer).toBeNull();
    expect(result.pendingQuestion).toEqual({
      toolCallId: 'ask-valid',
      question: '更想看哪种方向？',
      options: ['剧情向', '互动向'],
    });
  });
});
