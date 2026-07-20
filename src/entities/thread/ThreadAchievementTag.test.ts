import { describe, expect, it } from 'vitest';

import { getReactionAchievement } from './ThreadAchievementTag';

describe('帖子点赞成就等级', () => {
  it.each([
    [99, null],
    [100, '百赞'],
    [999, '百赞'],
    [1000, '千赞'],
    [9999, '千赞'],
    [10000, '万赞'],
  ])('%i 点赞应该匹配 %s', (count, label) => {
    expect(getReactionAchievement(count)?.label || null).toBe(label);
  });
});
