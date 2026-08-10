import { describe, expect, it } from 'vitest';

import { getNaturalDateRange } from '@/features/search/lib/naturalDateRanges';

describe('SearchFilterPanel 自然周期', () => {
  const now = new Date(2026, 6, 18, 14, 30);

  it('今天应该使用本地零点边界', () => {
    expect(getNaturalDateRange('today', now)).toEqual({
      from: '2026-07-18',
      to: '2026-07-19',
    });
  });

  it('昨天应该覆盖前一个完整自然日', () => {
    expect(getNaturalDateRange('yesterday', now)).toEqual({
      from: '2026-07-17',
      to: '2026-07-18',
    });
  });

  it('本周应该从周一开始，到下周一结束', () => {
    expect(getNaturalDateRange('week', now)).toEqual({
      from: '2026-07-13',
      to: '2026-07-20',
    });
  });

  it('上周应该覆盖前一个完整自然周', () => {
    expect(getNaturalDateRange('lastWeek', now)).toEqual({
      from: '2026-07-06',
      to: '2026-07-13',
    });
  });

  it('本月应该从一号开始，到下月一号结束', () => {
    expect(getNaturalDateRange('month', now)).toEqual({
      from: '2026-07-01',
      to: '2026-08-01',
    });
  });

  it('上月应该覆盖前一个完整自然月', () => {
    expect(getNaturalDateRange('lastMonth', now)).toEqual({
      from: '2026-06-01',
      to: '2026-07-01',
    });
  });
});
