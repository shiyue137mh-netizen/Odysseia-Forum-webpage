import { describe, expect, it } from 'vitest';
import type { SearchResponse } from '@/entities/thread/types';
import {
  buildResultPageMap,
  computeBufferedPageTarget,
  computeNextExcludeIds,
} from './useSearchResults';

const page = (ids: string[], total: number) =>
  ({
    results: ids.map((id) => ({ thread_id: id })),
    total,
  }) as unknown as SearchResponse;

describe('computeNextExcludeIds', () => {
  it('没有任何页时返回 undefined', () => {
    expect(computeNextExcludeIds([])).toBeUndefined();
  });

  it('还有更多结果时，累积已加载的 ID', () => {
    expect(computeNextExcludeIds([page(['1', '2'], 10)])).toEqual(['1', '2']);
  });

  it('跨页累积并去重', () => {
    const next = computeNextExcludeIds([page(['1', '2'], 10), page(['2', '3'], 10)]);
    expect(next).toEqual(['1', '2', '3']);
  });

  it('已加载数量达到 total 时停止', () => {
    expect(computeNextExcludeIds([page(['1', '2'], 2)])).toBeUndefined();
  });

  // 回归：后端过滤 / 权限差异会让某一页返回 0 条但 total 仍然偏大。
  // 旧实现此时会返回与上一次完全相同的 exclude_thread_ids，
  // hasNextPage 恒为 true，IntersectionObserver 持续触发同一个请求，形成死循环。
  it('最后一页为空时停止，即使 total 尚未对上', () => {
    expect(computeNextExcludeIds([page(['1', '2'], 100), page([], 100)])).toBeUndefined();
  });

  it('最后一页全是已加载过的帖子时停止', () => {
    expect(
      computeNextExcludeIds([page(['1', '2'], 100), page(['1', '2'], 100)]),
    ).toBeUndefined();
  });
});

describe('computeBufferedPageTarget', () => {
  it('关闭预加载时不主动扩大目标页', () => {
    expect(computeBufferedPageTarget(2, false, 3)).toBe(2);
  });

  it('第一页保持三页缓冲时加载到第三页', () => {
    expect(computeBufferedPageTarget(1, true, 3)).toBe(3);
  });

  it('浏览到第二页后把目标向前滚动一页', () => {
    expect(computeBufferedPageTarget(2, true, 3)).toBe(4);
  });
});

describe('buildResultPageMap', () => {
  it('使用实际 API 页归属，而不是按固定 24 条推算', () => {
    const map = buildResultPageMap([
      page(['1', '2'], 10),
      page(['3'], 10),
    ]);

    expect(map.get('1')).toBe(1);
    expect(map.get('2')).toBe(1);
    expect(map.get('3')).toBe(2);
  });
});
