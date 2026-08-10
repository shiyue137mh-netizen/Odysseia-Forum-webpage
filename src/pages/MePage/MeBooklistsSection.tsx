import { BookOpen, RefreshCw } from "lucide-react";

import { BooklistCard } from "@/entities/booklist/BooklistCard";
import { BooklistListItem } from "@/entities/booklist/BooklistListItem";
import type { Booklist } from "@/entities/booklist/types";
import { useCardGridClass, useLayoutMode } from "@/shared/hooks/useSettings";

export type BooklistSubTab = "mine" | "collected";

interface MeBooklistsSectionProps {
  activeBooklists: Booklist[];
  collectLoading: boolean;
  isLoading: boolean;
  subTab: BooklistSubTab;
  userId?: string | number | null;
  onCreate: () => void;
  onDelete: (item: Booklist) => void;
  onEdit: (item: Booklist) => void;
  onOpen: (id: number) => void;
  onRefresh: () => void;
  onSetSubTab: (tab: BooklistSubTab) => void;
  onToggleCollect: (item: Booklist) => void;
}

export function MeBooklistsSection({
  activeBooklists,
  collectLoading,
  isLoading,
  subTab,
  userId,
  onCreate,
  onDelete,
  onEdit,
  onOpen,
  onRefresh,
  onSetSubTab,
  onToggleCollect,
}: MeBooklistsSectionProps) {
  const layoutMode = useLayoutMode();
  const gridClass = useCardGridClass();

  return (
    <section className="px-1">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 justify-center">
          <BookOpen className="h-4 w-4 text-(--od-accent)" />
          <h2 className="od-text-title">我的书单</h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="od-inline-action od-inline-action-primary w-full justify-center sm:w-auto"
        >
          新建书单
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onSetSubTab("mine")}
          className={`od-pill-chip text-xs ${
            subTab === "mine"
              ? "bg-(--od-accent)/10 text-(--od-accent) font-od-bold"
              : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) font-od-medium"
          }`}
        >
          我的创建
        </button>
        <button
          type="button"
          onClick={() => onSetSubTab("collected")}
          className={`od-pill-chip text-xs ${
            subTab === "collected"
              ? "bg-(--od-accent)/10 text-(--od-accent) font-od-bold"
              : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) font-od-medium"
          }`}
        >
          我的收藏
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="od-inline-action od-inline-action-ghost"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>

      {isLoading ? (
        <p className="od-text-body">正在加载书单...</p>
      ) : activeBooklists.length === 0 ? (
        <p className="od-text-body">这个分组里还没有内容，去创建一个吧～</p>
      ) : (
        <div
          className={
            layoutMode === "list"
              ? "flex flex-col space-y-od-list-gap"
              : gridClass
          }
        >
          {activeBooklists.map((booklist) => {
            const commonProps = {
              booklist,
              canManage: String(booklist.owner_id) === String(userId),
              onOpen,
              onToggleCollect,
              onEdit,
              onDelete,
              collectLoading,
            };

            return layoutMode === "list" ? (
              <BooklistListItem
                key={booklist.id}
                {...commonProps}
                ownerName={
                  booklist.author?.display_name ||
                  booklist.author?.global_name ||
                  booklist.author?.name ||
                  undefined
                }
                ownerAvatarUrl={booklist.author?.avatar_url ?? null}
                coverImageUrl={booklist.cover_image_url || null}
              />
            ) : (
              <BooklistCard key={booklist.id} {...commonProps} />
            );
          })}
        </div>
      )}
    </section>
  );
}
