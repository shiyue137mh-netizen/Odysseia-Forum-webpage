import { describe, expect, it } from 'vitest';

import { buildAISearchContext } from './context';

describe('AI 搜索动态上下文', () => {
  it('按偏好频道独立列出 Tag，频道间不合并重复 Tag', () => {
    const context = buildAISearchContext({
      user: { id: '1', username: 'tester' },
      preferences: {
        user_id: 1,
        preferred_channels: ['10', '20'],
        include_tags: ['角色卡'],
        exclude_tags: ['屏蔽标签'],
        include_keywords: '',
        exclude_keywords: '',
        exclude_keyword_exemption_markers: [],
        preview_image_mode: 'thumbnail',
        results_per_page: 5,
        ui_page_size: 24,
        sort_method: 'comprehensive',
        custom_base_sort: 'comprehensive',
      },
      channels: [
        {
          guild_id: '1',
          channel_id: '10',
          name: '角色区',
          available_tags: [
            { tag_id: 1, name: '教程' },
            { tag_id: 2, name: '屏蔽标签' },
          ],
          virtual_tags: [],
          real_thread_count: 1,
          virtual_thread_count: 0,
          total_thread_count: 1,
        },
        {
          guild_id: '1',
          channel_id: '20',
          name: '技术区',
          available_tags: [{ tag_id: 3, name: '教程' }],
          virtual_tags: [],
          real_thread_count: 1,
          virtual_thread_count: 0,
          total_thread_count: 1,
        },
      ],
    });

    expect(context).toContain('角色区（channel_id: 10）\n  可用 Tag: 教程');
    expect(context).toContain('技术区（channel_id: 20）\n  可用 Tag: 教程');
    expect(context.match(/屏蔽标签/g)).toHaveLength(1);
  });
});
