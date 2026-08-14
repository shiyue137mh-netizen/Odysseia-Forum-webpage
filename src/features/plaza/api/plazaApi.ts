import type { Author, BannerItem } from "@/entities/thread/types";
import type { Booklist } from "@/entities/booklist/types";
import { bannerApi } from "@/features/banner/api/bannerApi";
import { booklistsApi } from "@/features/booklists/api/booklistsApi";

export interface PlazaBannerItem {
  thread_id: string;
  title: string;
  cover_image_url: string;
  channel_id?: string;
  guild_id?: string;
  author?: Author;
}

type PlazaBannerSource = BannerItem & { author?: Author };

export const plazaApi = {
  getBanners: async (channelIds: string[] = []): Promise<PlazaBannerItem[]> => {
    const settledResponses = await Promise.allSettled([
      bannerApi.getActiveBanners(),
      ...channelIds.map((channelId) => bannerApi.getActiveBanners(channelId)),
    ]);
    const responses = settledResponses.flatMap((response) =>
      response.status === "fulfilled" ? [response.value] : [],
    );
    if (responses.length === 0) {
      const failure = settledResponses.find((response) => response.status === "rejected");
      throw failure && failure.status === "rejected" ? failure.reason : new Error("Banner 加载失败");
    }
    const uniqueItems = new Map<string, PlazaBannerSource>();
    for (const result of responses) {
      const legacyResult = result as unknown as { banners?: PlazaBannerSource[] };
      const items = Array.isArray(result)
        ? result as PlazaBannerSource[]
        : Array.isArray(legacyResult?.banners)
          ? legacyResult.banners
          : [];
      for (const item of items) {
        const threadId = String(item.thread_id ?? "");
        if (threadId && !uniqueItems.has(threadId)) uniqueItems.set(threadId, item);
      }
    }
    return Array.from(uniqueItems.values()).map((item) => ({
      thread_id: String(item.thread_id ?? ""),
      title: String(item.title ?? ""),
      cover_image_url: String(item.cover_image_url ?? ""),
      channel_id: item.channel_id ? String(item.channel_id) : undefined,
      guild_id: item.guild_id ? String(item.guild_id) : undefined,
      author: item.author,
    }));
  },

  getFeaturedBooklists: async (): Promise<Booklist[]> => {
    const response = await booklistsApi.listPublic({
      sortMethod: 3,
      sortOrder: "desc",
      pageIndex: 0,
      pageSize: 6,
      isTournament: false,
    });
    return response.results || [];
  },
};
