import { describe, expect, it } from 'vitest';

import type { ApiChannel } from '@/shared/hooks/useChannels';
import { buildDrawTagGroups } from './index';

const channel = (channelId: string, name: string, tags: string[]): ApiChannel => ({
  guild_id: 'guild',
  channel_id: channelId,
  name,
  available_tags: tags.map((tag, index) => ({ tag_id: index, name: tag })),
  virtual_tags: [],
  real_thread_count: 0,
  virtual_thread_count: 0,
  total_thread_count: 0,
});

describe('抽卡 Tag 分组', () => {
  it('应该将重复 Tag 放入共有池，只保留频道独有 Tag', () => {
    expect(buildDrawTagGroups([
      channel('a', '创作', ['教程', '绘画']),
      channel('b', '技术', ['教程', '前端']),
    ], null)).toEqual([
      { id: 'shared', name: '共有标签', tags: ['教程'] },
      { id: 'channel-a', name: '创作 · 特色', tags: ['绘画'] },
      { id: 'channel-b', name: '技术 · 特色', tags: ['前端'] },
    ]);
  });

  it('指定单个频道时应该展示该频道全部 Tag', () => {
    expect(buildDrawTagGroups([
      channel('a', '创作', ['教程', '绘画']),
      channel('b', '技术', ['教程', '前端']),
    ], ['a'])).toEqual([
      { id: 'a', name: '创作', tags: ['教程', '绘画'] },
    ]);
  });
});
