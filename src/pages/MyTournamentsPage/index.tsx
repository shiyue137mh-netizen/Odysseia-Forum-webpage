import { RefreshCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BooklistCard } from "@/entities/booklist/BooklistCard";
import type { Tournament } from "@/entities/tournament/types";
import { TournamentListItem } from "@/features/tournaments/components/TournamentListItem";
import {
  useMyTournamentsList,
  useToggleBooklistCollection,
} from "@/features/booklists/hooks/useBooklistsData";
import { useCardGridClass } from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";

export function MyTournamentsPage() {
  const navigate = useNavigate();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "my-tournaments",
    "list",
  );
  const gridClass = useCardGridClass();
  const listQuery = useMyTournamentsList();
  const collectMutation = useToggleBooklistCollection();

  const tournaments = listQuery.data?.results ?? [];

  const openManage = (tournament: Tournament) => {
    navigate(`/tournaments/manage/${tournament.id}`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center border-b border-(--od-border) pb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--od-text-tertiary)">
          Tournament Studio
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-(--od-text-primary) sm:text-4xl">
          我的赛事
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-(--od-text-secondary) sm:text-base">
          这里集中管理你举办的赛事，可以更新封面、简介，也可以整理参赛帖子。
        </p>

        <LayoutModeToggle
          value={layoutMode}
          onChange={setLayoutMode}
          className="mt-6"
        />
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex justify-end">
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
                </div>
              </div>
            ))}
          </div>
        ) : listQuery.isError ? (
          <div className="py-12 text-center text-sm text-(--od-text-secondary)">
            我的赛事暂时没有加载出来，稍后再试一次。
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="mx-auto h-10 w-10 text-(--od-text-tertiary)/45" />
            <p className="mt-4 text-base font-semibold text-(--od-text-primary)">
              暂无你举办的赛事
            </p>
            <p className="mt-1 text-sm text-(--od-text-secondary)">
              等赛事书单创建后，这里会出现可管理的入口。
            </p>
          </div>
        ) : layoutMode === "grid" ? (
          <div className={gridClass}>
            {tournaments.map((tournament) => (
              <BooklistCard
                key={tournament.id}
                booklist={tournament}
                canManage={false}
                onOpen={() => openManage(tournament)}
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
                onOpen={openManage}
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
      </section>
    </div>
  );
}
