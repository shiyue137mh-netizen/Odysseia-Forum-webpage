import { describe, expect, it, vi } from 'vitest';

import { bannerApi } from '@/features/banner/api/bannerApi';
import { plazaApi } from './plazaApi';

vi.mock('@/features/banner/api/bannerApi', () => ({
  bannerApi: { getActiveBanners: vi.fn() },
}));

vi.mock('@/features/booklists/api/booklistsApi', () => ({
  booklistsApi: { listPublic: vi.fn() },
}));

describe('广场 Banner', () => {
  it('合并全局与偏好频道 Banner，并按帖子 ID 去重', async () => {
    vi.mocked(bannerApi.getActiveBanners)
      .mockResolvedValueOnce([{ thread_id: '1', title: '全局' }] as any)
      .mockResolvedValueOnce([
        { thread_id: '1', title: '全局重复' },
        { thread_id: '2', title: '频道 A' },
      ] as any)
      .mockResolvedValueOnce([{ thread_id: '3', title: '频道 B' }] as any);

    const result = await plazaApi.getBanners(['10', '20']);

    expect(bannerApi.getActiveBanners).toHaveBeenNthCalledWith(1);
    expect(bannerApi.getActiveBanners).toHaveBeenNthCalledWith(2, '10');
    expect(bannerApi.getActiveBanners).toHaveBeenNthCalledWith(3, '20');
    expect(result.map((item) => item.thread_id)).toEqual(['1', '2', '3']);
  });
});
