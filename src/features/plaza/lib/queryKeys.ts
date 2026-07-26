export const plazaKeys = {
  all: ["plaza"] as const,
  banners: () => [...plazaKeys.all, "banners"] as const,
  booklists: () => [...plazaKeys.all, "booklists"] as const,
};
