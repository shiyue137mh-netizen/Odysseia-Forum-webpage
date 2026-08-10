import { useQuery } from "@tanstack/react-query";

import { discoveryApi, type DiscoveryRailKey } from "@/features/discovery/api/discoveryApi";
import { discoveryKeys } from "@/features/discovery/lib/queryKeys";

/** 发现轨道单次拉取的条数；广场"换一批"的单轨刷新也用它保持页大小一致 */
export const DISCOVERY_RAIL_LIMIT = 20;
const DISCOVERY_RAIL_DAYS = 30;

/** 一次性拉取全部发现轨道（最新 / 反应飙升 / 讨论飙升 / 收藏飙升）。 */
export function useDiscoveryRails(applyPreferences: boolean, days = DISCOVERY_RAIL_DAYS) {
  return useQuery({
    queryKey: discoveryKeys.rails({
      limit: DISCOVERY_RAIL_LIMIT,
      days,
      applyPreferences,
    }),
    queryFn: () =>
      discoveryApi.getRails({
        limit: DISCOVERY_RAIL_LIMIT,
        days,
        apply_preferences: applyPreferences,
      }),
    staleTime: 90 * 1000,
  });
}

export function useDiscoveryRail(
  key: DiscoveryRailKey,
  applyPreferences: boolean,
  days: number,
) {
  return useQuery({
    queryKey: discoveryKeys.rail({
      key,
      limit: DISCOVERY_RAIL_LIMIT,
      days,
      applyPreferences,
    }),
    queryFn: () =>
      discoveryApi.getRail(key, {
        limit: DISCOVERY_RAIL_LIMIT,
        days,
        apply_preferences: applyPreferences,
      }),
    staleTime: 90 * 1000,
  });
}
