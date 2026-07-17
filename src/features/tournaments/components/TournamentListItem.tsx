import { BookOpen, Eye, Medal, Star, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { Tournament } from "@/entities/tournament/types";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { tournamentsApi } from "@/features/tournaments/api/tournamentsApi";
import { tournamentKeys } from "@/features/tournaments/lib/queryKeys";
import { LazyImage } from "@/shared/ui/LazyImage";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";

interface TournamentListItemProps {
  tournament: Tournament;
  onOpen: (tournament: Tournament) => void;
  onToggleCollect: (tournament: Tournament) => void;
  collectLoading?: boolean;
}

export function TournamentListItem({
  tournament,
  onOpen,
  onToggleCollect,
  collectLoading,
}: TournamentListItemProps) {
  const fallbackCoverQuery = useQuery({
    queryKey: tournamentKeys.coverItems(tournament.id),
    queryFn: () =>
      tournamentsApi.listItems(tournament.id, {
        limit: 6,
        offset: 0,
      }),
    enabled: !tournament.cover_image_url,
    staleTime: 5 * 60 * 1000,
  });

  const fallbackCoverUrl =
    fallbackCoverQuery.data?.results
      ?.flatMap((item) => item.thumbnail_urls || [])
      .find(Boolean) || null;
  const coverImageUrl = tournament.cover_image_url || fallbackCoverUrl;
  const updatedText = formatRelativeDateTime(tournament.updated_at);

  return (
    <article
      className="group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-(--od-surface-card) text-(--od-text-primary) transition-colors focus-within:ring-2 focus-within:ring-(--od-accent)"
      onClick={() => onOpen(tournament)}
    >
      <div className="relative h-56 overflow-hidden bg-(--od-surface-shell) sm:h-72 lg:h-[21.5rem]">
        {coverImageUrl ? (
          <LazyImage
            src={coverImageUrl}
            alt={tournament.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Trophy className="h-16 w-16 text-(--od-text-tertiary)/30" />
          </div>
        )}

        <button
          type="button"
          disabled={collectLoading}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollect(tournament);
          }}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/85 backdrop-blur-md transition-colors hover:text-(--od-accent) disabled:pointer-events-none disabled:opacity-55"
          aria-label={tournament.collected_flag ? "取消收藏赛事" : "收藏赛事"}
          title={tournament.collected_flag ? "取消收藏" : "收藏"}
        >
          <Star
            className={`h-5 w-5 ${tournament.collected_flag ? "fill-current text-(--od-accent)" : ""}`}
          />
        </button>
      </div>

      <div className="relative border-t border-(--od-border) px-4 pb-6 pt-12 text-center sm:px-8 sm:pb-8 sm:pt-14">
        <div className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <AuthorIdentityLink
            author={tournament.author}
            fallbackName={`用户 ${tournament.owner_id}`}
            showName={false}
            avatarClassName="h-16 w-16 shadow-lg shadow-black/20"
          />
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-(--od-text-tertiary)">
              <span className="inline-flex items-center gap-1 text-(--od-accent)">
                <Medal className="h-3.5 w-3.5" />
                活动赛事
              </span>
              <span className="text-(--od-divider-strong)/70">/</span>
              <AuthorIdentityLink
                author={tournament.author}
                fallbackName={`用户 ${tournament.owner_id}`}
                showAvatar={false}
                nameClassName="max-w-40 text-(--od-text-secondary)"
              />
              <span className="text-(--od-divider-strong)/70">/</span>
              <span>{updatedText}</span>
            </div>

            <h2 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight text-(--od-text-primary) transition-colors group-hover:text-(--od-accent) sm:text-3xl">
              {tournament.title}
            </h2>

            <p className="mx-auto mt-4 line-clamp-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-(--od-text-secondary)">
              {tournament.description || "暂无简介"}
            </p>
          </div>

          <div className="mt-6 grid w-full max-w-lg grid-cols-3 gap-3 text-xs text-(--od-text-secondary)">
            <span className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center justify-center gap-1.5 text-(--od-text-tertiary)">
                <BookOpen className="h-3.5 w-3.5" />
                作品
              </span>
              <strong className="text-base font-semibold text-(--od-text-primary)">
                {tournament.item_count}
              </strong>
            </span>
            <span className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center justify-center gap-1.5 text-(--od-text-tertiary)">
                <Star className="h-3.5 w-3.5" />
                收藏
              </span>
              <strong className="text-base font-semibold text-(--od-text-primary)">
                {tournament.collection_count}
              </strong>
            </span>
            <span className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center justify-center gap-1.5 text-(--od-text-tertiary)">
                <Eye className="h-3.5 w-3.5" />
                浏览
              </span>
              <strong className="text-base font-semibold text-(--od-text-primary)">
                {tournament.view_count}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
