import { describe, expect, it } from 'vitest';
import type { SearchResponse } from '@/entities/thread/types';
import { computeNextExcludeIds } from './useSearchResults';

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
