import { afterEach, describe, expect, it, vi } from 'vitest';

import { createChatCompletion } from './chatCompletionsApi';

describe('Chat Completions 流式解析', () => {
  afterEach(() => vi.restoreAllMocks());

  it('合并推理片段和分片工具参数', async () => {
    const events = [
      { choices: [{ delta: { reasoning_content: '先搜索' } }] },
      {
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: 'call-1',
              function: { name: 'search_threads', arguments: '{"keywords":' },
            }],
          },
        }],
      },
      {
        choices: [{
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '"角色卡"}' } }],
          },
        }],
      },
    ];
    const body = `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' },
    }));
    const reasoning: string[] = [];
    const controller = new AbortController();

    const result = await createChatCompletion({
      baseUrl: 'https://example.com/v1',
      apiKey: '',
      model: 'test-model',
      sendClientHeader: false,
      messages: [{ role: 'user', content: '找角色卡' }],
      tools: [],
      signal: controller.signal,
      onReasoningDelta: (delta) => reasoning.push(delta),
    });

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
    expect(reasoning).toEqual(['先搜索']);
    expect(result.tool_calls?.[0]).toEqual({
      id: 'call-1',
      type: 'function',
      function: { name: 'search_threads', arguments: '{"keywords":"角色卡"}' },
    });
  });

  it('解析 DeepSeek 普通 JSON 响应中的 reasoning_content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '最终回答', reasoning_content: '内部推理' } }],
    }), { headers: { 'Content-Type': 'application/json' } }));
    const reasoning: string[] = [];

    const result = await createChatCompletion({
      baseUrl: 'https://example.com/v1',
      apiKey: '',
      model: 'deepseek-reasoner',
      sendClientHeader: false,
      messages: [{ role: 'user', content: '测试' }],
      tools: [],
      onReasoningDelta: (delta) => reasoning.push(delta),
    });

    expect(reasoning).toEqual(['内部推理']);
    expect(result.reasoning_content).toBe('内部推理');
  });

  it('Provider 未返回 reasoning 字段时不伪造思考内容', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '只有正文' } }],
    }), { headers: { 'Content-Type': 'application/json' } }));

    const result = await createChatCompletion({
      baseUrl: 'https://example.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      sendClientHeader: false,
      messages: [{ role: 'user', content: '测试' }],
      tools: [],
    });

    expect(result.reasoning_content).toBeUndefined();
  });
});
