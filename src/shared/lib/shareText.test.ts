import { describe, expect, it } from 'vitest';

import {
  buildBooklistShareText,
  buildTournamentShareText,
} from '@/shared/lib/shareText';

const collection = {
  id: 4643,
  title: '虚环杯',
  description: '赛事简介',
  item_count: 2,
  collection_count: 1,
  view_count: 95,
  is_public: true,
};

describe('shareText', () => {
  it('uses the canonical booklist URL', () => {
    expect(buildBooklistShareText(collection)).toContain('/booklists/4643');
    expect(buildBooklistShareText(collection)).not.toContain('/share/');
  });

  it('keeps tournament shares on the tournament page', () => {
    const text = buildTournamentShareText(collection);
    expect(text).toContain('分享赛事：《虚环杯》');
    expect(text).toContain('/tournaments/4643');
    expect(text).not.toContain('/share/');
    expect(text).not.toContain('/booklists/4643');
    expect(text).toContain('收录 2 个帖子 · 1 次收藏 · 95 次浏览');
  });
});
