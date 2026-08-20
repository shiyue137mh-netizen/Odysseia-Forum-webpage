import { describe, expect, it, vi } from 'vitest';

import { bannerApi } from '@/features/banner/api/bannerApi';
import type { BannerItem } from '@/entities/thread/types';
import { plazaApi } from './plazaApi';

vi.mock('@/features/banner/api/bannerApi', () => ({
  bannerApi: { getActiveBanners: vi.fn() },
}));

vi.mock('@/features/booklists/api/booklistsApi', () => ({
  booklistsApi: { listPublic: vi.fn() },
}));

describe('广场 Banner', () => {
  it('当提供偏好频道时，一次性传入 channel_ids 请求 Banner', async () => {
    vi.mocked(bannerApi.getActiveBanners).mockResolvedValueOnce([
      { thread_id: '1', title: 'Banner 1', cover_image_url: 'img1', channel_id: '10', target_type: 1 },
      { thread_id: '2', title: 'Banner 2', cover_image_url: 'img2', channel_id: '20', target_type: 1 },
    ] as unknown as BannerItem[]);

    const result = await plazaApi.getBanners(['10', '20']);

    expect(bannerApi.getActiveBanners).toHaveBeenCalledTimes(1);
    expect(bannerApi.getActiveBanners).toHaveBeenCalledWith(['10', '20']);
    expect(result).toHaveLength(2);
    expect(result[0]?.thread_id).toBe('1');
  });

  it('当偏好频道为空时，传入 undefined 获取全局活跃 Banner', async () => {
    vi.mocked(bannerApi.getActiveBanners).mockResolvedValueOnce([
      { thread_id: '1', title: '全局 Banner', cover_image_url: 'img1', channel_id: '0', target_type: 1 },
    ] as unknown as BannerItem[]);

    const result = await plazaApi.getBanners([]);

    expect(bannerApi.getActiveBanners).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(1);
  });
});
