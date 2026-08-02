import { describe, expect, it } from 'vitest';

import { extractAISearchFollowups, getStreamingSafeContent, parseAIResponse } from './responseParser';

describe('AI 搜索输出解析', () => {
  it('保留 Markdown 顺序并解析合法帖子引用', () => {
    const segments = parseAIResponse(
      '先看这个：\n<thread>\nthread_id: "123"\nreason: 很符合需求\noverview: 主角来到陌生城市寻找失踪的朋友\ntone: 温暖日常中带一点悬疑\n</thread>\n后续说明',
      new Set(['123']),
    );

    expect(segments).toEqual([
      { type: 'markdown', content: '先看这个：\n' },
      {
        type: 'thread',
        reference: {
          threadId: '123',
          reason: '很符合需求',
          overview: '主角来到陌生城市寻找失踪的朋友',
          tone: '温暖日常中带一点悬疑',
        },
      },
      { type: 'markdown', content: '\n后续说明' },
    ]);
  });

  it('伪造 ID 和非法 YAML 降级为普通 Markdown', () => {
    const text = '<thread>\nthread_id: "999"\nreason: 不可信\n</thread>';
    expect(parseAIResponse(text, new Set(['123']))).toEqual([{ type: 'markdown', content: text }]);
  });

  it('兼容模型常见的 XML 子节点格式', () => {
    const segments = parseAIResponse(
      '<thread>\n<threadId>123</threadId>\n<reason>符合需求</reason>\n<matches>\n- "奇幻"\n- "男性向"\n</matches>\n</thread>',
      new Set(['123']),
    );

    expect(segments[0]).toEqual({
      type: 'thread',
      reference: {
        threadId: '123',
        reason: '符合需求',
        overview: undefined,
        tone: undefined,
      },
    });
  });

  it('兼容旧 synopsis 字段并映射为概览', () => {
    const text = '<thread>\nthread_id: "123"\nreason: 旧会话\nsynopsis: 旧格式内容\n</thread>';
    expect(parseAIResponse(text, new Set(['123']))[0]).toMatchObject({
      type: 'thread',
      reference: { overview: '旧格式内容' },
    });
  });

  it('从正文底部提取三个不同方向的追问', () => {
    const result = extractAISearchFollowups(`回答正文
<followups>
items:
  - direction: broader
    text: 放宽时间范围
  - direction: narrower
    text: 只看高赞角色卡
  - direction: alternate
    text: 换成日常题材
</followups>`);

    expect(result.content).toBe('回答正文');
    expect(result.followups).toHaveLength(3);
    expect(result.followups.map((item) => item.direction)).toEqual(['broader', 'narrower', 'alternate']);
  });

  it('流式输出不会显示未闭合或已完成的追问 Schema', () => {
    expect(getStreamingSafeContent('正文\n<followups>\nitems:')).toBe('正文\n');
    expect(getStreamingSafeContent('正文\n<followups>\nitems: []\n</followups>')).toBe('正文\n');
  });

  it('非法追问会被丢弃而不是污染正文', () => {
    const result = extractAISearchFollowups('正文\n<followups>\nitems: []\n</followups>');
    expect(result).toEqual({ content: '正文', followups: [] });
  });
});
