import { describe, expect, it } from 'vitest';

import { parseAISearchComposer, serializeAISearchComposer } from './composer';

describe('AI 搜索富文本输入', () => {
  it('保留 Token 在句子中的原始位置和换行', () => {
    expect(parseAISearchComposer('帮我在 $tag:男性向$ 搜一下\n最近的作品')).toEqual([
      { type: 'text', content: '帮我在 ', start: 0, end: 4 },
      { type: 'token', token: { type: 'tag', value: '男性向' }, raw: '$tag:男性向$', start: 4, end: 13 },
      { type: 'text', content: ' 搜一下\n最近的作品', start: 13, end: 23 },
    ]);
  });

  it('把编辑 DOM 可逆地序列化为查询协议', () => {
    const root = document.createElement('div');
    root.append('帮我在 ');
    const token = document.createElement('span');
    token.dataset.aiTokenRaw = '$channel:123$';
    token.textContent = '频道名';
    root.append(token, document.createElement('br'), '搜索');
    expect(serializeAISearchComposer(root)).toBe('帮我在 $channel:123$\n搜索');
  });

  it('不把非法作者 ID 渲染成 Token', () => {
    expect(parseAISearchComposer('$author:小明$')).toEqual([
      { type: 'text', content: '$author:小明$', start: 0, end: 11 },
    ]);
  });
});
