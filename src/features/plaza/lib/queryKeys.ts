export const plazaKeys = {
  all: ["plaza"] as const,
  banners: () => [...plazaKeys.all, "banners"] as const,
  booklists: () => [...plazaKeys.all, "booklists"] as const,
  rails: (params: { limit: number; days: number; applyPreferences: boolean }) =>
    [...plazaKeys.all, "rails", { params }] as const,
};
