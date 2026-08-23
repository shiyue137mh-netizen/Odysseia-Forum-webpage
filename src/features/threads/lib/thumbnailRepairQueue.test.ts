import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchImagesApi } from '@/features/threads/api/fetchImagesApi';
import {
  bindThumbnailRepairQueryClient,
  reportBrokenThreadThumbnail,
} from '@/features/threads/lib/thumbnailRepairQueue';

vi.mock('@/features/threads/api/fetchImagesApi', () => ({
  fetchImagesApi: { refresh: vi.fn() },
}));

describe('缩略图修复缓存更新', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('只扫描可能持有 Thread 的缓存根键', async () => {
    const queryClient = new QueryClient();
    const threadCache = {
      results: [{ thread_id: '101', thumbnail_urls: ['old.webp'] }],
    };
    const unrelatedCache = {
      nested: { thread_id: '101', thumbnail_urls: ['unrelated.webp'] },
    };
    queryClient.setQueryData(['search', 'results'], threadCache);
    queryClient.setQueryData(['auth'], unrelatedCache);
    bindThumbnailRepairQueryClient(queryClient);

    vi.mocked(fetchImagesApi.refresh).mockResolvedValue({
      results: [
        { thread_id: '101', thumbnail_urls: ['repaired.webp'], updated: true },
      ],
    });

    reportBrokenThreadThumbnail({ threadId: '101', channelId: '202' });
    await vi.advanceTimersByTimeAsync(800);

    expect(queryClient.getQueryData(['search', 'results'])).toEqual({
      results: [{ thread_id: '101', thumbnail_urls: ['repaired.webp'] }],
    });
    expect(queryClient.getQueryData(['auth'])).toBe(unrelatedCache);
  });
});
