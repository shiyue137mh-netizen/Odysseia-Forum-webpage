import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  Medal,
  Pencil,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BooklistCard } from "@/entities/booklist/BooklistCard";
import type { Tournament } from "@/entities/tournament/types";
import { TournamentListItem } from "@/features/tournaments/components/TournamentListItem";
import { useTournamentsList } from "@/features/tournaments/hooks/useTournamentsData";
import { useToggleBooklistCollection } from "@/features/booklists/hooks/useBooklistsData";
import { AnimatedPagination } from "@/shared/ui/AnimatedPagination";
import { Select } from "@/shared/ui/Select";
import { useTournamentURLParams } from "@/features/tournaments/hooks/useTournamentURLParams";
import { useCardGridClass } from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { BannerFadeMedia } from "@/shared/ui/BannerFadeMedia";

const sortOptions = [
  { value: 1, label: "按参赛数" },
  { value: 2, label: "按浏览数" },
  { value: 3, label: "按收藏数" },
  { value: 4, label: "按创建时间" },
  { value: 5, label: "按更新时间" },
];

export function TournamentsPage() {
  const navigate = useNavigate();
  const { params, setParams } = useTournamentURLParams();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "tournaments",
    "list",
  );
  const gridClass = useCardGridClass();
  const collectMutation = useToggleBooklistCollection();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const { sort: sortMethod, page, query } = params;
  const [searchDraft, setSearchDraft] = useState(query);
  const pageIndex = page - 1;

  const listQuery = useTournamentsList({
    sortMethod,
    pageIndex,
    pageSize: 12,
    keywords: query || undefined,
  });

  const tournaments = listQuery.data?.results ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.limit ?? 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const bannerSlides = useMemo(() => {
    return tournaments
      .filter((tournament) => Boolean(tournament.cover_image_url))
      .slice(0, 8)
      .map((tournament) => ({
        id: tournament.id,
        image: tournament.cover_image_url || "",
        title: tournament.title,
      }));
  }, [tournaments]);

  const summaryText = useMemo(() => {
    if (query) return `找到 ${total} 个匹配赛事`;
    if (total <= 0) return "赛事档案正在整理中";
    return `正在展示 ${total} 个赛事合集`;
  }, [query, total]);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  useEffect(() => {
    if (activeBannerIndex < bannerSlides.length) return;
    setActiveBannerIndex(0);
  }, [activeBannerIndex, bannerSlides.length]);

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveBannerIndex((index) => (index + 1) % bannerSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [bannerSlides.length]);

  const openTournament = (tournament: Tournament) => {
    navigate(`/tournaments/${tournament.id}`);
  };
  const showPreviousBanner = () => {
    setActiveBannerIndex(
      (index) => (index - 1 + bannerSlides.length) % bannerSlides.length,
    );
  };
  const showNextBanner = () => {
    setActiveBannerIndex((index) => (index + 1) % bannerSlides.length);
  };
  const activeBanner = bannerSlides[activeBannerIndex];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[min(62vh,660px)] min-h-[360px] sm:min-h-[460px]">
          <BannerFadeMedia>
            {bannerSlides.length > 0 ? (
              bannerSlides.map((slide, index) => (
                <img
                  key={slide.id}
                  src={slide.image}
                  alt={slide.title}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    index === activeBannerIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-(--od-surface-shell)">
                <Trophy className="h-20 w-20 text-(--od-text-tertiary)/20" />
              </div>
            )}
          </BannerFadeMedia>

          <div className="absolute left-4 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-md sm:left-6 lg:left-8">
            <Trophy className="h-3.5 w-3.5 text-(--od-accent)" />
            赛事
          </div>

          {activeBanner && (
            <div className="absolute bottom-12 left-4 z-10 max-w-[calc(100%-2rem)] text-white drop-shadow-[0_2px_12px_rgb(0_0_0_/_0.75)] sm:left-6 sm:max-w-3xl lg:left-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                精选赛事
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug sm:text-2xl">
                {activeBanner.title}
              </h2>
            </div>
          )}

          {bannerSlides.length > 1 && (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={showPreviousBanner}
                className="absolute inset-y-0 left-0 z-5 w-1/2 cursor-w-resize"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={showNextBanner}
                className="absolute inset-y-0 right-0 z-5 w-1/2 cursor-e-resize"
              />
            </>
          )}

          {bannerSlides.length > 1 && (
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {bannerSlides.map((slide, index) => (
                <button
                  key={`${slide.id}-dot`}
                  type="button"
                  onClick={() => setActiveBannerIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeBannerIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                  aria-label={`切换到第 ${index + 1} 个赛事 Banner`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-8 p-4 pt-8 sm:p-6 sm:pt-10 lg:gap-10 lg:p-8 lg:pt-12">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center border-b border-(--od-border) pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-(--od-text-primary) sm:text-4xl">
            赛事区
          </h1>
          <div className="mt-5 inline-flex items-center gap-2 text-sm text-(--od-text-secondary)">
            <Medal className="h-4 w-4 text-(--od-accent)" />
            <span>{summaryText}</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_76%,transparent)] p-1">
              <button
                type="button"
                onClick={() => setLayoutMode("list")}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  layoutMode === "list"
                    ? "bg-(--od-accent) text-white"
                    : "text-(--od-text-secondary) hover:text-(--od-text-primary)"
                }`}
                aria-label="切换到列表展示"
                title="列表展示"
              >
                <Rows3 className="h-3.5 w-3.5" />
                列表
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  layoutMode === "grid"
                    ? "bg-(--od-accent) text-white"
                    : "text-(--od-text-secondary) hover:text-(--od-text-primary)"
                }`}
                aria-label="切换到网格展示"
                title="网格展示"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                网格
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/tournaments/mine")}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-(--od-accent) transition-colors hover:text-(--od-accent-hover)"
            >
              <Pencil className="h-3.5 w-3.5" />
              我的赛事
            </button>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setParams({ query: searchDraft });
                }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_72%,transparent)] px-4"
              >
                <Search className="h-4 w-4 shrink-0 text-(--od-text-tertiary)" />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="搜索赛事标题或简介"
                  aria-label="搜索赛事"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-(--od-text-primary) outline-none placeholder:text-(--od-text-tertiary)"
                />
                {searchDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDraft("");
                      setParams({ query: "" });
                    }}
                    className="text-(--od-text-tertiary) transition-colors hover:text-(--od-text-primary)"
                    aria-label="清除赛事搜索"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="shrink-0 text-xs font-semibold text-(--od-accent) transition-colors hover:text-(--od-accent-hover)"
                >
                  搜索
                </button>
              </form>

              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_72%,transparent)] px-4">
                <SlidersHorizontal className="h-4 w-4 text-(--od-text-tertiary)" />
                <Select
                  value={String(sortMethod)}
                  options={sortOptions.map((o) => ({
                    value: String(o.value),
                    label: o.label,
                  }))}
                  onChange={(v) => {
                    setParams({ sort: Number.parseInt(v, 10), page: 1 });
                  }}
                  variant="inline"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="od-inline-action od-inline-action-ghost justify-center"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>

          {listQuery.isLoading ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl bg-(--od-surface-card)"
                >
                  <div className="h-56 animate-pulse bg-(--od-surface-content) sm:h-72 lg:h-[21.5rem]" />
                  <div className="p-6">
                    <div className="h-6 w-1/3 animate-pulse rounded bg-(--od-surface-content)" />
                    <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-(--od-surface-content)" />
                    <div className="mt-6 h-4 w-1/2 animate-pulse rounded bg-(--od-surface-content)" />
                  </div>
                </div>
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="py-12 text-center text-sm text-(--od-text-secondary)">
              赛事列表暂时没有加载出来，稍后再试一次。
            </div>
          ) : tournaments.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-base font-semibold text-(--od-text-primary)">
                {query ? "没有找到匹配赛事" : "暂无赛事"}
              </p>
              <p className="mt-1 text-sm text-(--od-text-secondary)">
                {query ? "试试换一个关键词。" : "等活动开始后，这里会出现对应的赛事合集。"}
              </p>
            </div>
          ) : (
            <>
              {layoutMode === "grid" ? (
                <div className={gridClass}>
                  {tournaments.map((tournament) => (
                    <BooklistCard
                      key={tournament.id}
                      booklist={tournament}
                      canManage={false}
                      onOpen={() => openTournament(tournament)}
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
                <div className="flex flex-col gap-8">
                  {tournaments.map((tournament) => (
                    <TournamentListItem
                      key={tournament.id}
                      tournament={tournament}
                      onOpen={openTournament}
                      onToggleCollect={(item) =>
                        collectMutation.mutate({
                          id: item.id,
                          collected: Boolean(item.collected_flag),
                        })
                      }
                      collectLoading={collectMutation.isPending}
                    />
                  ))}
                </div>
              )}

              <AnimatedPagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                onChange={(newPage) => setParams({ page: newPage })}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
