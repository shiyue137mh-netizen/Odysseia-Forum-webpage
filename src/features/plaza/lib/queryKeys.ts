export const plazaKeys = {
  all: ["plaza"] as const,
  banners: (channelIds: string[] = []) => [...plazaKeys.all, "banners", channelIds] as const,
  booklists: () => [...plazaKeys.all, "booklists"] as const,
};
