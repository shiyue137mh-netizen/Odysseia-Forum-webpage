import { useEffect, useMemo, useState } from "react";
import { useInfiniteScrollTrigger } from "@/shared/hooks/useInfiniteScrollTrigger";
import { useListEntranceAnimation } from "@/shared/hooks/useListEntranceAnimation";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Medal,
  RefreshCw,
  Share2,
  Star,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import type { Tournament, TournamentItem } from "@/entities/tournament/types";
import { threadFromBooklistItem } from "@/entities/booklist/lib/threadFromBooklistItem";
import type { Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { ThreadCard } from "@/entities/thread/ThreadCard";
import { ThreadListItem } from "@/entities/thread/ThreadListItem";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useTournamentDetail,
  useTournamentItems,
} from "@/features/tournaments/hooks/useTournamentsData";
import { useToggleBooklistCollection } from "@/features/booklists/hooks/useBooklistsData";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import {
  buildTournamentShareText,
  copyTextToClipboard,
} from "@/shared/lib/shareText";
import { buildDiscordWebChannelUrl } from "@/shared/lib/discord";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { ShareTextDialog } from "@/shared/ui/ShareTextDialog";
import { useCardGridClass } from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";
import { PageStatusMessage } from "@/shared/ui/PageStatusMessage";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";

function toTournamentThread(
  item: TournamentItem,
  tournament: Tournament,
): Thread {
  return threadFromBooklistItem(item, {
    is_tournament: true,
    tournament_info_list: [
      {
        booklist_id: String(tournament.id),
        booklist_name: tournament.title,
      },
    ],
  });
}

export function TournamentDetailPage() {
  const { booklistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPreview } = usePreviewThread();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "tournament-detail",
    "list",
  );
  const gridClass = useCardGridClass();
  const [shareText, setShareText] = useState<string | null>(null);

  const normalizedBooklistId = String(booklistId || "").trim();
  const detailQuery = useTournamentDetail(normalizedBooklistId);
  const itemsQuery = useTournamentItems(normalizedBooklistId);
  const loadMoreRef = useInfiniteScrollTrigger(itemsQuery);
  const animateIn = useListEntranceAnimation(
    detailQuery.isLoading || itemsQuery.isLoading,
  );
  const collectMutation = useToggleBooklistCollection();

  const tournament = detailQuery.data;
  const items = useMemo(() => {
    return itemsQuery.data?.pages.flatMap((page) => page.results || []) ?? [];
  }, [itemsQuery.data]);
  const bannerSlides = useMemo(() => {
    const seen = new Set<string>();
    return items
      .flatMap((item) =>
        (item.thumbnail_urls || [])
          .filter((url) => {
            if (!url || seen.has(url)) return false;
            seen.add(url);
            return true;
          })
          .map((url) => ({
            url,
            title: item.title,
            threadId: item.thread_id,
          })),
      )
      .slice(0, 8);
  }, [items]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

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

  if (!normalizedBooklistId) {
    return <PageStatusMessage tone="error">无效赛事 ID</PageStatusMessage>;
  }

  if (detailQuery.isLoading || itemsQuery.isLoading) {
    return <PageStatusMessage>正在帮你加载赛事...</PageStatusMessage>;
  }

  if (detailQuery.isError || !tournament) {
    return (
      <PageStatusMessage tone="error">
        赛事加载出错了，可能不存在或已经被删除了
      </PageStatusMessage>
    );
  }

  const discordUrl = buildDiscordWebChannelUrl({
    guildId: GUILD_ID,
    channelId: tournament.tournament_channel_id || "",
  });
  const hasDiscordChannel = Boolean(tournament.tournament_channel_id);
  const activeBannerSlide = bannerSlides[activeBannerIndex];
  const isOwner = String(tournament.owner_id ?? "") === String(user?.id ?? "");
  const showPreviousBanner = () => {
    setActiveBannerIndex(
      (index) => (index - 1 + bannerSlides.length) % bannerSlides.length,
    );
  };
  const showNextBanner = () => {
    setActiveBannerIndex((index) => (index + 1) % bannerSlides.length);
  };

  const handleCopyShareText = async () => {
    if (!shareText) return;
    const copied = await copyTextToClipboard(shareText);
    if (copied) {
      toast.success("分享文案已复制");
      return;
    }
    toast.warning("自动复制失败，可以手动选中文案复制");
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="relative w-full overflow-hidden bg-(--od-surface-shell)">
          <div className="relative h-[min(78vh,860px)] min-h-[420px] sm:min-h-[560px]">
            {bannerSlides.length > 0 ? (
              bannerSlides.map((slide, index) => (
                <img
                  key={`${slide.threadId}-${slide.url}`}
                  src={slide.url}
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
            <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-start justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/85 backdrop-blur-md transition-colors hover:text-white"
                aria-label="返回"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-md">
                <Trophy className="h-3.5 w-3.5 text-(--od-accent)" />
                Tournament
              </div>

              <span className="h-9 w-9" aria-hidden="true" />
            </div>

            {activeBannerSlide && (
              <div className="absolute bottom-12 left-4 z-10 max-w-[calc(100%-2rem)] text-white drop-shadow-[0_2px_12px_rgb(0_0_0_/_0.75)] sm:left-6 sm:max-w-3xl lg:left-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  参赛作品
                </p>
                <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug sm:text-2xl">
                  {activeBannerSlide.title}
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
                    key={`${slide.threadId}-${slide.url}-dot`}
                    type="button"
                    onClick={() => setActiveBannerIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeBannerIndex
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                    aria-label={`切换到第 ${index + 1} 张赛事作品图`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8 lg:pt-12">
          <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
            <section className="mx-auto flex w-full max-w-4xl flex-col items-center border-b border-(--od-border) pb-8 text-center">
              <AuthorAvatar
                author={tournament.author}
                className="h-20 w-20 ring-2 ring-(--od-border)"
              />
              <p className="mt-3 text-xs text-(--od-text-tertiary)">
                {tournament.author?.display_name ||
                  tournament.author?.global_name ||
                  tournament.author?.name ||
                  `用户 ${tournament.owner_id}`}
              </p>

              <h1 className="mt-4 max-w-3xl break-words text-3xl font-bold tracking-tight text-(--od-text-primary) sm:text-4xl">
                {tournament.title}
              </h1>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-(--od-text-secondary) sm:text-base">
                {tournament.description || "暂无简介"}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-(--od-text-tertiary)">
                <span className="inline-flex items-center gap-1">
                  <Medal className="h-3.5 w-3.5" />
                  {tournament.item_count} 个参赛作品
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  {tournament.collection_count} 次收藏
                </span>
                <span>{formatRelativeDateTime(tournament.updated_at)}</span>
                <span>{tournament.is_public ? "公开赛事" : "私有赛事"}</span>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <LayoutModeToggle value={layoutMode} onChange={setLayoutMode} />

                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors ${
                    hasDiscordChannel
                      ? "text-(--od-accent) hover:text-(--od-accent-hover)"
                      : "pointer-events-none text-(--od-text-tertiary)"
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Discord
                </a>

                <button
                  type="button"
                  onClick={() => detailQuery.refetch()}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShareText(buildTournamentShareText(tournament))
                  }
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  分享
                </button>

                <button
                  type="button"
                  onClick={() =>
                    collectMutation.mutate({
                      id: tournament.id,
                      collected: Boolean(tournament.collected_flag),
                    })
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors hover:text-(--od-accent) ${
                    tournament.collected_flag
                      ? "text-(--od-accent)"
                      : "text-(--od-text-secondary)"
                  }`}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${tournament.collected_flag ? "fill-current" : ""}`}
                  />
                  {tournament.collected_flag ? "已收藏" : "收藏赛事"}
                </button>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/tournaments/manage/${normalizedBooklistId}`)
                    }
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-(--od-accent) transition-colors hover:text-(--od-accent-hover)"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    管理赛事
                  </button>
                )}
              </div>
            </section>

            {items.length === 0 ? (
              <div className="rounded-xl border border-(--od-border) bg-(--od-card) p-10 text-center">
                <p className="text-base font-semibold text-(--od-text-primary)">
                  暂无参赛作品
                </p>
                <p className="mt-1 text-sm text-(--od-text-secondary)">
                  赛事作品还在整理中，再晚点来看吧。
                </p>
              </div>
            ) : (
              <div
                className={
                  layoutMode === "list"
                    ? "min-w-0 flex flex-col space-y-od-list-gap"
                    : `${gridClass} min-w-0`
                }
              >
                {items.map((item) => (
                  <div
                    key={`${item.booklist_item_id}-${item.thread_id}`}
                    className={
                      layoutMode === "list"
                        ? "min-w-0"
                        : "flex min-w-0 flex-col"
                    }
                  >
                    {layoutMode === "list" ? (
                      <ThreadListItem
                        thread={toTournamentThread(item, tournament)}
                        onPreview={openPreview}
                        booklistComment={item.comment || ""}
                        animateIn={animateIn}
                      />
                    ) : (
                      <ThreadCard
                        thread={toTournamentThread(item, tournament)}
                        onPreview={openPreview}
                        booklistComment={item.comment || ""}
                        animateIn={animateIn}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {itemsQuery.hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-(--od-text-tertiary)" />
              </div>
            )}
          </div>
        </div>
      </div>

      {shareText && (
        <ShareTextDialog
          title="分享这个赛事"
          text={shareText}
          onClose={() => setShareText(null)}
          onCopy={handleCopyShareText}
        />
      )}
    </>
  );
}
