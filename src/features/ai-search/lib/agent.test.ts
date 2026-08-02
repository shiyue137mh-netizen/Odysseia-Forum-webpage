import { describe, expect, it } from 'vitest';

import { buildAISearchSessionHistory } from './agent';

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
});
