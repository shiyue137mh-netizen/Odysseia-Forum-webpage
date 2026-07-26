import { useQuery } from "@tanstack/react-query";

import { tagsApi } from "@/features/tags/api/tagsApi";
import { tagKeys } from "@/features/tags/lib/queryKeys";

/** 标签统计（含虚拟标签）。channelIds 传 null 表示全部频道。 */
export function useTagStats(channelIds: Array<number | string> | null) {
  const params = { channel_ids: channelIds, include_virtual: true };

  return useQuery({
    queryKey: tagKeys.stats(params),
    queryFn: () => tagsApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });
}
