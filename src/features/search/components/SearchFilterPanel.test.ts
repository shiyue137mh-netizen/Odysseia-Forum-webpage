import { describe, expect, it } from 'vitest';

import { getNaturalDateRange } from './SearchFilterPanel';

describe('SearchFilterPanel 自然周期', () => {
  const now = new Date(2026, 6, 18, 14, 30);

  it('今天应该使用本地零点边界', () => {
    expect(getNaturalDateRange('today', now)).toEqual({
      from: '2026-07-18',
      to: '2026-07-19',
    });
  });

  it('本周应该从周一开始，到下周一结束', () => {
    expect(getNaturalDateRange('week', now)).toEqual({
      from: '2026-07-13',
      to: '2026-07-20',
    });
  });

  it('本月应该从一号开始，到下月一号结束', () => {
    expect(getNaturalDateRange('month', now)).toEqual({
      from: '2026-07-01',
      to: '2026-08-01',
    });
  });
});
