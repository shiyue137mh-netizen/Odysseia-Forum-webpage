import { useEffect, useMemo, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useMyBooklistsList } from "@/features/booklists/hooks/useBooklistsData";
import { booklistsApi } from "@/features/booklists/api/booklistsApi";
import { booklistKeys } from "@/features/booklists/lib/queryKeys";
import {
  extractErrorMessage,
  notifyError,
  notifySuccess,
} from "@/shared/lib/notify";

interface QuickAddToBooklistModalProps {
  isOpen: boolean;
  threadId: string;
  threadTitle?: string;
  onClose: () => void;
}

export function QuickAddToBooklistModal({
  isOpen,
  threadId,
  threadTitle,
  onClose,
}: QuickAddToBooklistModalProps) {
  const queryClient = useQueryClient();
  const myBooklistsQuery = useMyBooklistsList({
    markThreadId: threadId,
    enabled: isOpen && /^\d+$/.test(threadId),
  });
  const [selectedBooklistIds, setSelectedBooklistIds] = useState<Set<number>>(
    new Set(),
  );
  const [initialBooklistIds, setInitialBooklistIds] = useState<Set<number>>(
    new Set(),
  );
  const [comment, setComment] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const myBooklists = myBooklistsQuery.data?.results || [];

  useEffect(() => {
    if (!isOpen) {
      dialogRef.current?.close();
      return;
    }
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !myBooklistsQuery.data) return;
    const markedIds = new Set(
      (myBooklistsQuery.data.results || [])
        .filter((booklist) => booklist.is_marked)
        .map((booklist) => booklist.id),
    );
    setSelectedBooklistIds(markedIds);
    setInitialBooklistIds(new Set(markedIds));
    setComment("");
  }, [isOpen, myBooklistsQuery.data]);

  const canSubmit = useMemo(() => {
    if (!/^\d+$/.test(threadId) || !myBooklistsQuery.isSuccess) return false;
    const selectionChanged =
      selectedBooklistIds.size !== initialBooklistIds.size ||
      [...selectedBooklistIds].some((id) => !initialBooklistIds.has(id));
    return (
      selectionChanged ||
      (selectedBooklistIds.size > 0 && comment.trim().length > 0)
    );
  }, [
    comment,
    initialBooklistIds,
    myBooklistsQuery.isSuccess,
    selectedBooklistIds,
    threadId,
  ]);

  const syncMutation = useMutation({
    mutationFn: () =>
      booklistsApi.syncItems({
        thread_id: threadId,
        scope_booklist_ids: myBooklists.map((booklist) => booklist.id),
        target_booklist_ids: [...selectedBooklistIds],
        comment: comment.trim() || undefined,
      }),
    onSuccess: (result) => {
      const added = result.added_to_booklist_ids?.length || 0;
      const removed = result.removed_from_booklist_ids?.length || 0;
      const changes = [
        added > 0 ? `加入 ${added} 个书单` : null,
        removed > 0 ? `移出 ${removed} 个书单` : null,
      ].filter(Boolean);
      notifySuccess(changes.length > 0 ? changes.join("，") : "书单内容已更新");
      queryClient.invalidateQueries({ queryKey: booklistKeys.all });
      onClose();
    },
    onError: (error) => {
      notifyError(extractErrorMessage(error, "添加到书单失败"));
    },
  });

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="od-floating-panel-solid fixed inset-0 z-[3000] m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-(--od-border) p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs outline-hidden open:flex open:flex-col"
    >
      <div
        className="flex w-full flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-(--od-border) px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-(--od-text-primary)">
              快捷收藏到书单
            </h2>
            {threadTitle && (
              <p className="mt-1 truncate text-xs text-(--od-text-tertiary)">
                {threadTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-(--od-text-tertiary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {!/^\d+$/.test(threadId) ? (
            <p className="text-sm text-(--od-error)">
              当前帖子 ID 无效，暂时无法加入书单。
            </p>
          ) : myBooklistsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-(--od-text-secondary)">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载你的书单...
            </div>
          ) : myBooklistsQuery.isError ? (
            <div className="space-y-3 text-sm text-(--od-error)">
              <p>
                {extractErrorMessage(myBooklistsQuery.error, "加载书单失败")}
              </p>
              <button
                type="button"
                onClick={() => myBooklistsQuery.refetch()}
                className="rounded-lg border border-(--od-border) px-3 py-2 text-(--od-text-secondary) hover:bg-(--od-bg-secondary)"
              >
                重新加载
              </button>
            </div>
          ) : myBooklists.length === 0 ? (
            <p className="text-sm text-(--od-text-secondary)">
              你还没有创建书单，先去书单页新建一个吧。
            </p>
          ) : (
            <>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                {myBooklists.map((booklist) => (
                  <label
                    key={booklist.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${
                      selectedBooklistIds.has(booklist.id)
                        ? "border-(--od-accent) bg-(--od-accent)/8"
                        : "border-(--od-border) hover:border-(--od-border-strong)"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBooklistIds.has(booklist.id)}
                      onChange={() => {
                        setSelectedBooklistIds((current) => {
                          const next = new Set(current);
                          if (next.has(booklist.id)) next.delete(booklist.id);
                          else next.add(booklist.id);
                          return next;
                        });
                      }}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-(--od-text-primary)">
                        {booklist.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-(--od-text-tertiary)">
                        {booklist.item_count} 帖子 · {booklist.collection_count}{" "}
                        收藏
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-(--od-text-secondary)">
                  推荐语（可选）
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="填写后会应用到所有勾选的书单..."
                  className="w-full min-h-[80px] rounded-lg border border-(--od-border) bg-(--od-surface-input) p-3 text-sm text-(--od-text-primary) outline-hidden focus:border-(--od-accent) transition-colors"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-(--od-border) pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canSubmit || syncMutation.isPending}
              onClick={() => {
                syncMutation.mutate();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-(--od-accent) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--od-accent-hover) disabled:opacity-60"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              保存书单
            </button>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
