import { useCallback, useEffect, useMemo, useState } from "react";
import { Dices, Plus, RotateCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Booklist } from "@/entities/booklist/types";
import { BooklistCard } from "@/entities/booklist/BooklistCard";
import { filterThreadsByPreferences } from "@/entities/thread/lib/threadFilter";
import type { Thread } from "@/entities/thread/types";
import { useToggleBooklistCollection } from "@/features/booklists/hooks/useBooklistsData";
import {
  discoveryApi,
  type DiscoveryRailKey,
} from "@/features/discovery/api/discoveryApi";
import {
  DISCOVERY_RAIL_LIMIT,
  useDiscoveryRails,
} from "@/features/discovery/hooks/useDiscoveryRails";
import { PreferenceFilterNotice } from "@/features/preferences/components/PreferenceFilterNotice";
import { getDiscoveryPreferenceContext } from "@/features/preferences/lib/discoveryPreferences";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import {
  usePlazaBanners,
  usePlazaFeaturedBooklists,
} from "@/features/plaza/hooks/usePlazaData";
import { usePreviewStore } from "@/features/search/store/previewStore";
import { useTournamentsList } from "@/features/tournaments/hooks/useTournamentsData";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { buildDiscordWebThreadUrl } from "@/shared/lib/discord";
import {
  CompactBooklistCard,
  CompactThreadCard,
  CompactThreadCardSkeleton,
  ThreadRankingPanel,
} from "@/widgets/content-display/ContentDisplayCards";
import { BannerCarousel } from "@/widgets/layout/BannerCarousel";

interface RailRefreshButtonProps {
  label: string;
  onRefresh: () => void;
  isLoading: boolean;
}

function RailRefreshButton({
  label,
  onRefresh,
  isLoading,
}: RailRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isLoading}
      className="od-inline-action od-inline-action-ghost gap-1.5"
    >
      <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}

export function PlazaPage() {
  const navigate = useNavigate();
  const setPreviewThread = usePreviewStore((state) => state.setPreviewThread);
  const { preferences } = useUserPreferences({ guildId: GUILD_ID });
  const [ignorePreferenceFilter, setIgnorePreferenceFilter] = useState(false);
  const [railThreadsMap, setRailThreadsMap] = useState<
    Record<string, Thread[]>
  >({});
  const [refreshingKeys, setRefreshingKeys] = useState<Record<string, boolean>>(
    {},
  );
  const [railOffsets, setRailOffsets] = useState<Record<string, number>>({});

  const hasActivePreferences = useMemo(() => {
    if (!preferences) return false;
    return Boolean(
      preferences.preferred_channels?.length ||
        preferences.include_tags?.length ||
        preferences.exclude_tags?.length,
    );
  }, [preferences]);

  const discoveryPreferenceContext = useMemo(
    () => getDiscoveryPreferenceContext(preferences),
    [preferences],
  );

  const bannersQuery = usePlazaBanners();
  const booklistsQuery = usePlazaFeaturedBooklists();

  const tournamentsQuery = useTournamentsList({
    pageIndex: 0,
    pageSize: 3,
    sortMethod: 4,
    sortOrder: "desc",
  });

  const railsQuery = useDiscoveryRails(!ignorePreferenceFilter);

  useEffect(() => {
    if (!railsQuery.data) return;

    const applyFilter = (threads: Thread[]) =>
      !ignorePreferenceFilter
        ? filterThreadsByPreferences(threads, discoveryPreferenceContext)
        : threads;

    setRailThreadsMap({
      latest: applyFilter(railsQuery.data.latest || []),
      reaction_surge: applyFilter(railsQuery.data.reaction_surge || []),
      discussion_surge: applyFilter(railsQuery.data.discussion_surge || []),
      collection_surge: applyFilter(railsQuery.data.collection_surge || []),
    });
    setRailOffsets({
      latest: railsQuery.data.latest?.length || 0,
      reaction_surge: railsQuery.data.reaction_surge?.length || 0,
      discussion_surge: railsQuery.data.discussion_surge?.length || 0,
      collection_surge: railsQuery.data.collection_surge?.length || 0,
    });
  }, [railsQuery.data, ignorePreferenceFilter, discoveryPreferenceContext]);

  const handleRefreshRail = useCallback(
    async (key: DiscoveryRailKey) => {
      if (refreshingKeys[key]) return;
      setRefreshingKeys((previous) => ({ ...previous, [key]: true }));

      try {
        const currentList = railThreadsMap[key] || [];
        const currentOffset = railOffsets[key] ?? currentList.length;
        let nextThreads = await discoveryApi.getRail(key, {
          limit: DISCOVERY_RAIL_LIMIT,
          days: 30,
          offset: currentOffset,
          apply_preferences: !ignorePreferenceFilter,
        });
        let nextOffset = currentOffset + nextThreads.length;

        if (nextThreads.length === 0 && currentOffset > 0) {
          nextThreads = await discoveryApi.getRail(key, {
            limit: DISCOVERY_RAIL_LIMIT,
            days: 30,
            offset: 0,
            apply_preferences: !ignorePreferenceFilter,
          });
          nextOffset = nextThreads.length;
        }

        if (nextThreads.length === 0) return;
        const filteredThreads = !ignorePreferenceFilter
          ? filterThreadsByPreferences(nextThreads, discoveryPreferenceContext)
          : nextThreads;

        setRailThreadsMap((previous) => ({
          ...previous,
          [key]: filteredThreads,
        }));
        setRailOffsets((previous) => ({
          ...previous,
          [key]: nextOffset,
        }));
      } catch (error) {
        console.error(`[PlazaPage] Failed to refresh rail ${key}:`, error);
      } finally {
        setRefreshingKeys((previous) => ({ ...previous, [key]: false }));
      }
    },
    [
      discoveryPreferenceContext,
      ignorePreferenceFilter,
      railOffsets,
      railThreadsMap,
      refreshingKeys,
    ],
  );

  const collectMutation = useToggleBooklistCollection();
  const latestThreads = railThreadsMap.latest || [];
  const reactionThreads = railThreadsMap.reaction_surge || [];
  const discussionThreads = railThreadsMap.discussion_surge || [];
  const collectionThreads = railThreadsMap.collection_surge || [];
  const latestRankThreads =
    latestThreads.length > 8 ? latestThreads.slice(8) : latestThreads;

  return (
    <div className="flex min-h-screen flex-col animate-in fade-in duration-500">
      <section className="w-full">
        {bannersQuery.isLoading ? (
          <div className="h-48 w-full animate-pulse bg-(--od-surface-input) xl:h-64" />
        ) : bannersQuery.data && bannersQuery.data.length > 0 ? (
          <BannerCarousel
            fullWidth={true}
            banners={bannersQuery.data.map((banner) => ({
              id: banner.thread_id,
              image: banner.cover_image_url || '',
              title: banner.title,
              description: banner.author
                ? `作者：${banner.author.display_name || banner.author.global_name || banner.author.name}`
                : "点击可以直接探索原帖",
              link: buildDiscordWebThreadUrl({
                guildId: banner.guild_id || GUILD_ID,
                channelId: banner.channel_id,
                threadId: banner.thread_id,
              }),
            }))}
            onBannerClick={(banner) => {
              const url =
                banner.link ||
                buildDiscordWebThreadUrl({
                  guildId: GUILD_ID,
                  channelId: banner.id,
                  threadId: banner.id,
                });
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          />
        ) : (
          <BannerCarousel fullWidth={true} banners={[]} />
        )}
      </section>

      <header className="flex flex-col gap-4 px-4 pb-2 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-(--od-text-primary)">
              广场
            </h1>
            <p className="mt-1 text-sm text-(--od-text-secondary)">
              新作、书单和社区热榜，都收在这里。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/draw")}
              className="od-inline-action od-inline-action-primary"
            >
              <Dices className="h-4 w-4" />
              随机抽卡
            </button>
            <button
              type="button"
              onClick={() => navigate("/booklists")}
              className="od-inline-action od-inline-action-ghost"
            >
              <Plus className="h-4 w-4" />
              书单
            </button>
          </div>
        </div>

        {hasActivePreferences && (
          <PreferenceFilterNotice
            ignored={ignorePreferenceFilter}
            onIgnore={() => setIgnorePreferenceFilter(true)}
            onRestore={() => setIgnorePreferenceFilter(false)}
            onOpenSettings={() => navigate("/me?tab=preferences")}
          />
        )}
      </header>

      <main className="flex flex-col gap-10 p-4 sm:p-6 lg:p-8">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-(--od-text-primary)">
              正在发生
            </h2>
            <RailRefreshButton
              label="换一批"
              onRefresh={() => handleRefreshRail("latest")}
              isLoading={refreshingKeys.latest}
            />
          </div>

          {railsQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {Array.from({ length: 8 }).map((_, index) => (
                <CompactThreadCardSkeleton key={index} />
              ))}
            </div>
          ) : latestThreads.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {latestThreads.slice(0, 8).map((thread) => (
                <CompactThreadCard
                  key={thread.thread_id}
                  thread={thread}
                  onOpen={setPreviewThread}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-(--od-text-tertiary)">
              暂时没有可展示的新内容。
            </p>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-(--od-text-primary)">
                书单精选
              </h2>
              <p className="mt-1 text-xs text-(--od-text-tertiary)">
                由大家整理的专题入口
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/booklists")}
                className="od-inline-action od-inline-action-ghost"
              >
                全部书单
              </button>
              <button
                type="button"
                onClick={() => navigate("/booklists")}
                className="od-inline-action od-inline-action-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                创建
              </button>
            </div>
          </div>

          {booklistsQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl bg-(--od-surface-input)"
                />
              ))}
            </div>
          ) : booklistsQuery.data && booklistsQuery.data.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {booklistsQuery.data.slice(0, 6).map((booklist: Booklist) => (
                <CompactBooklistCard
                  key={booklist.id}
                  booklist={booklist}
                  collectLoading={collectMutation.isPending}
                  onOpen={(id) => navigate(`/booklists/${id}`)}
                  onToggleCollect={(item) =>
                    collectMutation.mutate({
                      id: item.id,
                      collected: Boolean(item.collected_flag),
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-(--od-text-tertiary)">
              暂时没有精选书单。
            </p>
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-(--od-text-primary)">
              榜单精选
            </h2>
            <p className="mt-1 text-xs text-(--od-text-tertiary)">
              上下滚动右侧排行，最靠近中心的内容会显示在左侧。
            </p>
          </div>

          {railsQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl bg-(--od-surface-input)"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ThreadRankingPanel
                title="点赞飙升"
                badge="近 7 天"
                threads={reactionThreads}
                metric="reaction"
                refreshing={refreshingKeys.reaction_surge}
                onOpen={setPreviewThread}
                onRefresh={() => handleRefreshRail("reaction_surge")}
              />
              <ThreadRankingPanel
                title="讨论升温"
                badge="近 7 天"
                threads={discussionThreads}
                metric="discussion"
                refreshing={refreshingKeys.discussion_surge}
                onOpen={setPreviewThread}
                onRefresh={() => handleRefreshRail("discussion_surge")}
              />
              <ThreadRankingPanel
                title="收藏上升"
                badge="近 30 天"
                threads={collectionThreads}
                metric="collection"
                refreshing={refreshingKeys.collection_surge}
                onOpen={setPreviewThread}
                onRefresh={() => handleRefreshRail("collection_surge")}
              />
              <ThreadRankingPanel
                title="新作速递"
                badge="刚刚更新"
                threads={latestRankThreads}
                metric="latest"
                refreshing={refreshingKeys.latest}
                onOpen={setPreviewThread}
                onRefresh={() => handleRefreshRail("latest")}
              />
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-(--od-text-primary)">
                <Trophy className="h-5 w-5 text-(--od-accent)" />
                赛事精选
              </h2>
              <p className="mt-1 text-xs text-(--od-text-tertiary)">
                最近创建的社区赛事
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/tournaments")}
              className="od-inline-action od-inline-action-ghost"
            >
              全部赛事
            </button>
          </div>

          {tournamentsQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-2xl bg-(--od-surface-input)"
                />
              ))}
            </div>
          ) : tournamentsQuery.data?.results.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tournamentsQuery.data.results.slice(0, 3).map((tournament) => (
                <BooklistCard
                  key={tournament.id}
                  booklist={tournament}
                  canManage={false}
                  onOpen={() => navigate(`/tournaments/${tournament.id}`)}
                  onToggleCollect={(item) =>
                    collectMutation.mutate({
                      id: item.id,
                      collected: Boolean(item.collected_flag),
                    })
                  }
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                  collectLoading={collectMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-(--od-text-tertiary)">
              暂时没有可展示的赛事。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
