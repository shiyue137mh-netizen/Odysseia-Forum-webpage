import { describe, expect, it } from 'vitest';

import { buildYesterdayPopularQuery } from '@/features/search/lib/searchPresets';
import { tokenizeSearchPayload } from '@/shared/lib/searchTokenizer';

describe('搜索引导预设', () => {
  it('组合昨天的自然日范围与百赞下限', () => {
    const payload = tokenizeSearchPayload(
      buildYesterdayPopularQuery(new Date(2026, 6, 18, 14, 30)),
    );

    expect(payload.dateFrom).toBe('2026-07-17');
    expect(payload.dateTo).toBe('2026-07-18');
    expect(payload.reactionMin).toBe(100);
  });
});
