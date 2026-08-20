import { apiClient } from '@/shared/api/client';
import type { BannerItem } from '@/entities/thread/types';

export interface BannerApplicationRequest {
    thread_id: string;
    cover_image_url: string;
    target_scope: string;
}

export interface BannerApplicationResponse {
    success: boolean;
    message: string;
    application_id?: number;
}

export const bannerApi = {
    apply: async (data: BannerApplicationRequest): Promise<BannerApplicationResponse> => {
        const response = await apiClient.post<BannerApplicationResponse>('/banner/apply', data);
        return response.data;
    },

    getActiveBanners: async (channelIds?: string[]): Promise<BannerItem[]> => {
        const params: Record<string, unknown> = {};
        if (channelIds && channelIds.length > 0) {
            params.channel_ids = channelIds;
        }
        const response = await apiClient.get<BannerItem[]>('/banner/active', {
            params,
            paramsSerializer: {
                indexes: null,
            },
        });
        return response.data;
    },
};
