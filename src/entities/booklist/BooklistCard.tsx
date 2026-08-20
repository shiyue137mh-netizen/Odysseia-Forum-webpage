import type { Booklist } from "@/entities/booklist/types";
import {
  BookOpen,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { AuthorIdentityLink } from "@/features/authors/components/AuthorIdentityLink";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/ContextMenu";
import { toast } from "sonner";

interface BooklistCardProps {
  booklist: Booklist;
  canManage: boolean;
  onOpen: (booklistId: number) => void;
  onToggleCollect: (booklist: Booklist) => void;
  onEdit: (booklist: Booklist) => void;
  onDelete: (booklist: Booklist) => void;
  collectLoading?: boolean;
}

export function BooklistCard({
  booklist,
  canManage,
  onOpen,
  onToggleCollect,
  onEdit,
  onDelete,
  collectLoading,
}: BooklistCardProps) {
  const updatedText = formatRelativeDateTime(booklist.updated_at);
  const ariaLabel = `书单：${booklist.title}。${booklist.description || "暂无简介"}。包含 ${booklist.item_count} 个帖子，${booklist.collection_count} 次收藏。更新于 ${updatedText}`;

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/booklists/${booklist.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("已复制书单链接");
    } catch {
      toast.error("复制链接失败");
    }
  };

  const handleOpenInNewTab = () => {
    window.open(`/booklists/${booklist.id}`, "_blank", "noopener,noreferrer");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(booklist.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-full">
        <article
          role="button"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="group relative flex h-full cursor-pointer flex-col rounded-[1.1rem] p-2 pb-5 text-(--od-text-primary) transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
          style={{ WebkitTapHighlightColor: "transparent" }}
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest("button, a")) e.preventDefault();
          }}
          onClick={() => onOpen(booklist.id)}
        >
          {/* 拦截 Tab 焦点进入内部元素，并对辅助技术隐藏内部细节 */}
          <div
            aria-hidden="true"
            className="pointer-events-auto flex h-full w-full flex-col"
            ref={(el) => {
              if (el) {
                const focusables = el.querySelectorAll('a, button, [tabindex="0"]');
                focusables.forEach((node) => {
                  node.setAttribute("tabindex", "-1");
                });
              }
            }}
          >
            <button
              type="button"
              disabled={collectLoading}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollect(booklist);
              }}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:pointer-events-none disabled:opacity-55"
              aria-label={booklist.collected_flag ? "取消收藏书单" : "收藏书单"}
              title={booklist.collected_flag ? "取消收藏" : "收藏"}
            >
              <Star
                className={`h-5 w-5 ${booklist.collected_flag ? "fill-current text-(--od-accent)" : ""}`}
              />
            </button>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] bg-[color-mix(in_srgb,var(--od-surface-content)_64%,transparent)]">
              {booklist.cover_image_url ? (
                <img
                  src={booklist.cover_image_url}
                  alt={booklist.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-8 w-8 text-(--od-text-tertiary)" />
                </div>
              )}
            </div>

            <div className="-mt-6 flex justify-center">
              <AuthorIdentityLink
                author={booklist.author}
                fallbackName={`用户 ${booklist.owner_id}`}
                showName={false}
                avatarClassName="h-12 w-12 shadow-lg shadow-black/20"
              />
            </div>

            <div className="mt-2 flex min-w-0 flex-1 flex-col text-center">
              <AuthorIdentityLink
                author={booklist.author}
                fallbackName={`用户 ${booklist.owner_id}`}
                showAvatar={false}
                nameClassName="max-w-full text-xs text-(--od-text-secondary)"
                className="mx-auto max-w-full"
              />

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-(--od-text-tertiary)">
                  {booklist.is_public ? (
                    <Globe className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  <span>{booklist.is_public ? "公开" : "私有"}</span>
                </span>
                <span className="text-(--od-text-tertiary)/55">•</span>
                <span className="text-(--od-text-tertiary)">{updatedText}</span>
              </div>

              <h3 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight text-(--od-text-primary) transition-colors group-hover:text-(--od-accent)">
                {booklist.title}
              </h3>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-(--od-text-secondary)">
                {booklist.description || "暂无简介"}
              </p>

              <div className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4 text-[12px] text-(--od-text-secondary)">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                  <span className="text-(--od-accent)">{booklist.item_count}</span>
                  <span>帖子</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                  <span className="text-(--od-accent)">
                    {booklist.collection_count}
                  </span>
                  <span>收藏</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                  <span className="text-(--od-accent)">{booklist.view_count}</span>
                  <span>浏览</span>
                </span>
              </div>

              {canManage && (
                <div className="mt-3 flex items-center justify-end gap-1">
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
                </div>
              )}
            </div>
          </div>
        </article>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          icon={<BookOpen className="h-4 w-4" />}
          onClick={() => onOpen(booklist.id)}
        >
          查看书单
        </ContextMenuItem>
        <ContextMenuItem
          icon={<Star className="h-4 w-4" />}
          onClick={() => onToggleCollect(booklist)}
        >
          {booklist.collected_flag ? "取消收藏" : "收藏书单"}
        </ContextMenuItem>
        <ContextMenuItem
          icon={<Copy className="h-4 w-4" />}
          onClick={handleCopyLink}
        >
          复制书单链接
        </ContextMenuItem>
        <ContextMenuItem
          icon={<ExternalLink className="h-4 w-4" />}
          onClick={handleOpenInNewTab}
        >
          在新标签页打开
        </ContextMenuItem>

        {canManage && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(booklist)}
            >
              编辑书单
            </ContextMenuItem>
            <ContextMenuItem
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => onDelete(booklist)}
            >
              删除书单
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
