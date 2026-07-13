import type { DiscoveryRailKey } from "@/features/discovery/api/discoveryApi";
import type { DiscoveryPreferenceContext } from "@/features/preferences/lib/discoveryPreferences";

export const plazaKeys = {
  all: ["plaza"] as const,
  banners: () => [...plazaKeys.all, "banners"] as const,
  booklists: () => [...plazaKeys.all, "booklists"] as const,
  rails: (params: { limit: number; days: number; applyPreferences: boolean }) =>
    [...plazaKeys.all, "rails", { params }] as const,
  rail: (
    railKey: DiscoveryRailKey,
    preferencePatch: DiscoveryPreferenceContext | null,
  ) => [...plazaKeys.all, "rail", railKey, { preferencePatch }] as const,
};
