import { BookOpen, Eye, Globe, Lock, Pencil, Star, Trash2 } from "lucide-react";

import type { Booklist } from "@/entities/booklist/types";
import { LazyImage } from "@/shared/ui/LazyImage";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";

interface BooklistListItemProps {
  booklist: Booklist;
  canManage: boolean;
  coverImageUrl?: string | null;
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  onOpen: (booklistId: number) => void;
  onToggleCollect: (booklist: Booklist) => void;
  onEdit: (booklist: Booklist) => void;
  onDelete: (booklist: Booklist) => void;
  collectLoading?: boolean;
}

export function BooklistListItem({
  booklist,
  canManage,
  coverImageUrl,
  ownerName,
  ownerAvatarUrl,
  onOpen,
  onToggleCollect,
  onEdit,
  onDelete,
  collectLoading,
}: BooklistListItemProps) {
  const updatedText = formatRelativeDateTime(booklist.updated_at);

  const ownerFallbackName = ownerName || `用户 ${booklist.owner_id}`;

  return (
    <article
      className="group relative w-full cursor-pointer py-3 text-(--od-text-primary) transition-colors duration-200"
      onClick={() => onOpen(booklist.id)}
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--od-divider-strong)_60%,transparent),transparent)]" />

      <div className="flex items-start gap-3 md:gap-5">
        <div className="w-16 shrink-0 md:w-54 lg:w-58">
          <div className="relative h-20 overflow-hidden rounded-xl bg-(--od-surface-shell) md:h-43 md:rounded-2xl">
            {coverImageUrl ? (
              <LazyImage
                src={coverImageUrl}
                alt={booklist.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-(--od-text-tertiary)">
                <BookOpen className="h-5 w-5 opacity-40 md:h-10 md:w-10" />
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 self-stretch">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--od-text-tertiary)">
              <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-(--od-bg-tertiary)">
                <LazyImage
                  src={
                    ownerAvatarUrl ||
                    "https://cdn.discordapp.com/embed/avatars/0.png"
                  }
                  alt={ownerFallbackName}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="max-w-40 truncate text-(--od-text-secondary)">
                {ownerFallbackName}
              </span>
              <span className="text-(--od-divider-strong)/75">/</span>
              <span className="inline-flex items-center gap-1">
                {booklist.is_public ? (
                  <Globe className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {booklist.is_public ? "公开" : "私有"}
              </span>
              <span className="text-(--od-divider-strong)/75">/</span>
              <span>{updatedText}</span>
            </div>

            <div className="mb-3 flex items-start gap-2.5 pr-2">
              <h3 className="min-w-0 flex-1 text-lg font-semibold leading-snug tracking-[-0.02em] text-(--od-text-primary) transition-colors duration-200 group-hover:text-(--od-text-heading)">
                {booklist.title}
              </h3>
            </div>

            <p className="mb-3 line-clamp-2 whitespace-pre-line break-all text-sm leading-relaxed text-(--od-text-secondary) md:max-w-[72ch]">
              {booklist.description || "暂无简介"}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-(--od-text-secondary)">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                <span className="tabular-nums">{booklist.item_count}</span>
                <span>帖子</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                <span className="tabular-nums">
                  {booklist.collection_count}
                </span>
                <span>收藏</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                <span className="tabular-nums">{booklist.view_count}</span>
                <span>浏览</span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
            <button
              type="button"
              disabled={collectLoading}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollect(booklist);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:pointer-events-none disabled:opacity-55"
              aria-label={booklist.collected_flag ? "取消收藏书单" : "收藏书单"}
              title={booklist.collected_flag ? "取消收藏" : "收藏"}
            >
              <Star
                className={`h-4 w-4 ${booklist.collected_flag ? "fill-current text-(--od-accent)" : ""}`}
              />
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(booklist);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:text-(--od-text-primary)"
                  aria-label="编辑书单"
                  title="编辑"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(booklist);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:text-(--od-error)"
                  aria-label="删除书单"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
