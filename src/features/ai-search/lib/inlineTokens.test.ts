import { describe, expect, it } from 'vitest';

import { parseAISearchInlineTokens } from './inlineTokens';

describe('AI 回复 Token 解析', () => {
  it('解析 Tag、作者 ID 和频道 ID', () => {
    expect(parseAISearchInlineTokens('看看 $tag:日常$ 和 $author:123$ 的 $channel:456$')).toEqual([
      { type: 'markdown', content: '看看 ' },
      { type: 'token', token: { type: 'tag', value: '日常' } },
      { type: 'markdown', content: ' 和 ' },
      { type: 'token', token: { type: 'author', value: '123' } },
      { type: 'markdown', content: ' 的 ' },
      { type: 'token', token: { type: 'channel', value: '456' } },
    ]);
  });

  it('非法 ID 和代码中的模板语法保持为 Markdown', () => {
    expect(parseAISearchInlineTokens('`$author:abc$` 与 $channel:not-id$')).toEqual([
      { type: 'markdown', content: '`$author:abc$`' },
      { type: 'markdown', content: ' 与 $channel:not-id$' },
    ]);
  });
});
