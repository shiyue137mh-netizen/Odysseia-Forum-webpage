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
});
