import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { CHANNEL_CATEGORIES } from '@/shared/config/channelCategories.private';

export interface ApiChannel {
  guild_id: string;
  channel_id: string;
  name: string;
  available_tags: { tag_id: number; name: string }[];
  virtual_tags: { tag_name: string; source_channel_ids: string[] }[];
  mapped_source_channels?: { channel_id: string; channel_name: string; available_tags: { tag_id: number; name: string }[] }[];
  real_thread_count: number;
  virtual_thread_count: number;
  total_thread_count: number;
}

export interface UnifiedChannel {
  id: string;
  name: string;
  groupId?: string;
  groupName?: string;
  totalThreadCount?: number;
  realThreadCount?: number;
  virtualThreadCount?: number;
}

export interface ChannelTagCatalogItem {
  channel_id: string;
  channel_name: string;
  available_tags: string[];
  virtual_tags: string[];
}

function uniqueTagNames(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  );
}

export function buildChannelTagCatalog(
  apiChannels: ApiChannel[] | null | undefined,
): ChannelTagCatalogItem[] {
  return (apiChannels || []).map((channel) => ({
    channel_id: channel.channel_id,
    channel_name: channel.name || channel.channel_id,
    available_tags: uniqueTagNames([
      ...channel.available_tags.map((tag) => tag.name),
      ...(channel.mapped_source_channels || []).flatMap((source) =>
        source.available_tags.map((tag) => tag.name),
      ),
    ]),
    virtual_tags: uniqueTagNames(
      channel.virtual_tags.map((tag) => tag.tag_name),
    ),
  }));
}

export function useChannels() {
  return useQuery({
    queryKey: ['meta', 'channels'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ApiChannel[]>('/meta/channels');
        const apiChannels = response.data;
        
        // 我们需要把后端的平铺频道，和前端静态配置的"分组(Category)"映射起来
        // 如果后端频道在静态配置中找不到分组，我们就给个默认的"其他区"分组
        const apiChannelMap = new Map<string, ApiChannel>();
        for (const ac of apiChannels) {
          apiChannelMap.set(ac.channel_id, ac);
        }

        // 收集所有被主频道映射的子服务器源频道 ID
        // 这些源频道不应该被独立展示在侧边栏中
        const hiddenSourceChannels = new Set<string>();
        for (const ac of apiChannels) {
          if (ac.mapped_source_channels) {
            for (const mapSrc of ac.mapped_source_channels) {
              hiddenSourceChannels.add(mapSrc.channel_id);
            }
          }
        }

        const channels: UnifiedChannel[] = [];
        const seen = new Set<string>();

        // 1. 优先严格按照 CHANNEL_CATEGORIES 定义的分组和频道顺序组织
        CHANNEL_CATEGORIES.forEach((category, catIndex) => {
          category.channels.forEach((c) => {
            const ac = apiChannelMap.get(c.id);
            if (ac && !hiddenSourceChannels.has(c.id) && !seen.has(c.id)) {
              seen.add(c.id);
              channels.push({
                id: c.id,
                name: ac.name || c.name,
                groupId: `cat-${catIndex}`,
                groupName: category.name,
                totalThreadCount: ac.total_thread_count,
                realThreadCount: ac.real_thread_count,
                virtualThreadCount: ac.virtual_thread_count,
              });
            }
          });
        });

        // 2. 兜底：若后端返回了未在静态配置中声明的频道，统一追加到“其他区”
        for (const ac of apiChannels) {
          if (seen.has(ac.channel_id)) continue;
          if (hiddenSourceChannels.has(ac.channel_id)) continue;

          seen.add(ac.channel_id);
          channels.push({
            id: ac.channel_id,
            name: ac.name,
            groupId: 'cat-other',
            groupName: '其他区',
            totalThreadCount: ac.total_thread_count,
            realThreadCount: ac.real_thread_count,
            virtualThreadCount: ac.virtual_thread_count,
          });
        }
        
        return {
          source: 'api' as const,
          channels,
          apiData: apiChannels,
          tagCatalog: buildChannelTagCatalog(apiChannels),
        };
      } catch (err) {
        console.warn('Failed to fetch /meta/channels, falling back to static config', err);
        // Fallback 到静态配置
        const fallbackChannels: UnifiedChannel[] = [];
        CHANNEL_CATEGORIES.forEach((category, catIndex) => {
          category.channels.forEach((c) => {
            fallbackChannels.push({
              id: c.id,
              name: c.name,
              groupId: `cat-${catIndex}`,
              groupName: category.name,
            });
          });
        });
        
        return {
          source: 'static' as const,
          channels: fallbackChannels,
          apiData: null,
          tagCatalog: [],
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes, 频道数据不常变
    retry: 1, // 失败重试1次后降级
  });
}
