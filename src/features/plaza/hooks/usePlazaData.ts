import { useQuery } from "@tanstack/react-query";

import { plazaApi } from "@/features/plaza/api/plazaApi";
import { plazaKeys } from "@/features/plaza/lib/queryKeys";

export function usePlazaBanners() {
  return useQuery({
    queryKey: plazaKeys.banners(),
    queryFn: plazaApi.getBanners,
    staleTime: 60 * 1000,
  });
}

export function usePlazaFeaturedBooklists() {
  return useQuery({
    queryKey: plazaKeys.booklists(),
    queryFn: plazaApi.getFeaturedBooklists,
    staleTime: 2 * 60 * 1000,
  });
}
