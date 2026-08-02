import { describe, expect, it } from 'vitest';

import {
  applyAISearchMentionToken,
  findAISearchMentionTrigger,
  insertAISearchLineBreak,
} from './mentions';

describe('AI 搜索 @ Token', () => {
  it('只识别光标前正在输入的 @ 查询', () => {
    expect(findAISearchMentionTrigger('帮我找 @温暖', 7)).toEqual({
      query: '温暖',
      start: 4,
      end: 7,
    });
    expect(findAISearchMentionTrigger('邮箱 test@example.com', 17)).toBeNull();
    expect(findAISearchMentionTrigger('帮我在@男性向', 7)).toEqual({
      query: '男性向',
      start: 3,
      end: 7,
    });
  });

  it('用精确作者 ID 替换触发文本并保留已有 Token', () => {
    const trigger = findAISearchMentionTrigger('找 @小明 的作品', 5);
    expect(trigger).not.toBeNull();
    expect(applyAISearchMentionToken('找 @小明 的作品', trigger!, 'author', '123456789')).toEqual({
      value: '找 $author:123456789$ 的作品',
      caret: 21,
    });
  });

  it('在句尾 Token 后建立可编辑空格，避免中文输入法吞掉首键', () => {
    const trigger = findAISearchMentionTrigger('帮我找@男性向', 7);
    expect(applyAISearchMentionToken('帮我找@男性向', trigger!, 'tag', '男性向')).toEqual({
      value: '帮我找$tag:男性向$ ',
      caret: 13,
    });
  });

  it('在光标位置显式插入换行并替换选区', () => {
    expect(insertAISearchLineBreak('第一行第二行', 3, 3)).toEqual({
      value: '第一行\n第二行',
      caret: 4,
    });
    expect(insertAISearchLineBreak('第一行旧内容', 3, 6)).toEqual({
      value: '第一行\n',
      caret: 4,
    });
  });
});
