import { describe, expect, it, vi } from 'vitest';

import { fromDateTimeLocal, toDateTimeLocal } from './tournamentDateTime';

describe('赛事参赛时间', () => {
  it('把 datetime-local 按浏览器本地时区转换为 UTC', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480);
    expect(fromDateTimeLocal('2026-08-27T20:00')).toBe('2026-08-27T12:00:00.000Z');
  });

  it('把 UTC 响应回填为浏览器本地墙上时间', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480);
    expect(toDateTimeLocal('2026-08-27T12:00:00Z')).toBe('2026-08-27T20:00');
  });

  it('保留空值语义', () => {
    expect(fromDateTimeLocal('')).toBeNull();
    expect(fromDateTimeLocal(undefined)).toBeUndefined();
  });
});
