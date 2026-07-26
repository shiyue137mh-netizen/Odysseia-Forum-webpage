import { useMemo, useState } from "react";
import { useInfiniteScrollTrigger } from "@/shared/hooks/useInfiniteScrollTrigger";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Trophy,
} from "lucide-react";

import type { BooklistItem } from "@/entities/booklist/types";
import { threadFromBooklistItem } from "@/entities/booklist/lib/threadFromBooklistItem";
import type { Thread } from "@/entities/thread/types";
import { ThreadCard } from "@/entities/thread/ThreadCard";
import { ThreadListItem } from "@/entities/thread/ThreadListItem";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AddThreadsToBooklistModal } from "@/features/booklists/components/AddThreadsToBooklistModal";
import { BooklistFormModal } from "@/features/booklists/components/BooklistFormModal";
import { BooklistItemEditorModal } from "@/features/booklists/components/BooklistItemEditorModal";
import {
  useAddBooklistItems,
  useBooklistDetail,
  useBooklistItems,
  useDeleteBooklist,
  useRemoveBooklistItems,
  useUpdateBooklist,
  useUpdateBooklistItem,
} from "@/features/booklists/hooks/useBooklistsData";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import { useCardGridClass } from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";
import { PageStatusMessage } from "@/shared/ui/PageStatusMessage";

function toTournamentThread(item: BooklistItem): Thread {
  return threadFromBooklistItem(item, { is_tournament: true });
}

export function TournamentManagePage() {
  const { booklistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPreview } = usePreviewThread();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "tournament-manage",
    "list",
  );
  const gridClass = useCardGridClass();

  const normalizedBooklistId = String(booklistId || "").trim();
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<BooklistItem | null>(null);

  const detailQuery = useBooklistDetail(normalizedBooklistId);
  const itemsQuery = useBooklistItems(normalizedBooklistId);
  const loadMoreRef = useInfiniteScrollTrigger(itemsQuery);
  const tournament = detailQuery.data;
  const items = useMemo(() => {
    return itemsQuery.data?.pages.flatMap((page) => page.results || []) ?? [];
  }, [itemsQuery.data]);
  const isOwner = useMemo(
    () => String(tournament?.owner_id ?? "") === String(user?.id ?? ""),
    [tournament?.owner_id, user?.id],
  );

  const updateMutation = useUpdateBooklist(Number(normalizedBooklistId), () =>
    setShowEdit(false),
  );
  const deleteMutation = useDeleteBooklist(() => navigate("/tournaments/mine"));
  const addItemsMutation = useAddBooklistItems(normalizedBooklistId, () =>
    setShowAdd(false),
  );
  const removeItemMutation = useRemoveBooklistItems(normalizedBooklistId);
  const updateItemMutation = useUpdateBooklistItem(normalizedBooklistId, () =>
    setEditingItem(null),
  );

  if (!normalizedBooklistId) {
    return <PageStatusMessage tone="error">无效赛事 ID</PageStatusMessage>;
  }

  if (detailQuery.isLoading || itemsQuery.isLoading) {
    return <PageStatusMessage>正在帮你加载赛事管理台...</PageStatusMessage>;
  }

  if (detailQuery.isError || !tournament) {
    return (
      <PageStatusMessage tone="error">
        赛事加载出错了，可能不存在或已经被删除了
      </PageStatusMessage>
    );
  }

  if (!tournament.is_tournament) {
    return (
      <PageStatusMessage tone="error">
        这个书单不是赛事书单，不能在这里管理。
      </PageStatusMessage>
    );
  }

  if (!isOwner) {
    return (
      <PageStatusMessage tone="error">
        只有赛事举办者可以管理这个赛事。
      </PageStatusMessage>
    );
  }

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center border-b border-(--od-border) pb-8 text-center">
            <button
              type="button"
              onClick={() => navigate("/tournaments/mine")}
              className="mb-5 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回我的赛事
            </button>

            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-(--od-text-tertiary)">
              <Trophy className="h-3.5 w-3.5 text-(--od-accent)" />
              Tournament Studio
            </p>
            <h1 className="mt-3 max-w-3xl break-words text-3xl font-bold tracking-tight text-(--od-text-primary) sm:text-4xl">
              {tournament.title}
            </h1>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-(--od-text-secondary) sm:text-base">
              {tournament.description || "暂无简介"}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <LayoutModeToggle value={layoutMode} onChange={setLayoutMode} />

              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
              >
                <Edit3 className="h-3.5 w-3.5" />
                编辑赛事
              </button>

              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-(--od-accent) transition-colors hover:text-(--od-accent-hover)"
              >
                <Plus className="h-3.5 w-3.5" />
                添加参赛帖子
              </button>

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
                onClick={() => navigate(`/tournaments/${normalizedBooklistId}`)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                查看展示页
              </button>
            </div>
          </section>

          {items.length === 0 ? (
            <div className="rounded-xl border border-(--od-border) bg-(--od-card) p-10 text-center">
              <p className="text-base font-semibold text-(--od-text-primary)">
                还没有参赛帖子
              </p>
              <p className="mt-1 text-sm text-(--od-text-secondary)">
                可以添加 Thread ID，把参赛作品整理进这个赛事。
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
                    layoutMode === "list" ? "min-w-0" : "flex min-w-0 flex-col"
                  }
                >
                  {layoutMode === "list" ? (
                    <ThreadListItem
                      thread={toTournamentThread(item)}
                      onPreview={openPreview}
                      booklistComment={item.comment || ""}
                    />
                  ) : (
                    <ThreadCard
                      thread={toTournamentThread(item)}
                      onPreview={openPreview}
                      booklistComment={item.comment || ""}
                    />
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                    >
                      <Save className="h-3.5 w-3.5" />
                      编辑参赛信息
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItemMutation.mutate(String(item.thread_id))}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-(--od-error) transition-colors hover:text-(--od-error)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      移除参赛帖子
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {itemsQuery.hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-(--od-text-tertiary)" />
            </div>
          )}

          <section className="border-t border-(--od-border) pt-5">
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`确认删除赛事「${tournament.title}」？`)) return;
                deleteMutation.mutate(Number(normalizedBooklistId));
              }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-(--od-error) transition-colors hover:text-(--od-error)"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除赛事
            </button>
          </section>
        </div>
      </div>

      <BooklistFormModal
        isOpen={showEdit}
        initialValue={tournament}
        submitting={updateMutation.isPending}
        entityLabel="赛事"
        titlePlaceholder="输入赛事标题"
        descriptionPlaceholder="写一段简介，说明赛事规则、投稿范围或归档说明"
        publicLabel="公开赛事"
        onClose={() => setShowEdit(false)}
        onSubmit={(payload) => updateMutation.mutate({ payload })}
      />

      <AddThreadsToBooklistModal
        isOpen={showAdd}
        submitting={addItemsMutation.isPending}
        title="添加参赛帖子"
        submitLabel="添加到赛事"
        commentLabel="统一参赛说明（可选）"
        enableTournamentFields
        onClose={() => setShowAdd(false)}
        onSubmit={(items) => addItemsMutation.mutate(items)}
      />

      <BooklistItemEditorModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        submitting={updateItemMutation.isPending}
        title="编辑参赛帖子信息"
        commentLabel="参赛说明"
        enableTournamentFields
        onClose={() => setEditingItem(null)}
        onSubmit={(payload) => {
          if (!editingItem) return;
          updateItemMutation.mutate({
            threadId: String(editingItem.thread_id),
            payload,
          });
        }}
      />
    </>
  );
}
