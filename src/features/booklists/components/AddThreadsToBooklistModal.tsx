import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, X } from "lucide-react";
import type { BooklistItemAddInput } from "@/entities/booklist/types";
import { fromDateTimeLocal } from "@/features/booklists/lib/tournamentDateTime";

interface AddThreadsToBooklistModalProps {
  isOpen: boolean;
  submitting?: boolean;
  title?: string;
  submitLabel?: string;
  commentLabel?: string;
  enableTournamentFields?: boolean;
  onClose: () => void;
  onSubmit: (items: BooklistItemAddInput[]) => void;
}

function parseThreadIds(raw: string): string[] {
  const segments = raw
    .split(/[\n,\s]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const ids = segments.filter((part) => /^\d+$/.test(part));
  return Array.from(new Set(ids));
}

export function AddThreadsToBooklistModal({
  isOpen,
  ...contentProps
}: AddThreadsToBooklistModalProps) {
  if (!isOpen) return null;
  return <AddThreadsToBooklistModalContent {...contentProps} />;
}

function AddThreadsToBooklistModalContent({
  submitting,
  title = "批量添加帖子",
  submitLabel = "添加到书单",
  commentLabel = "统一备注（可选）",
  enableTournamentFields = false,
  onClose,
  onSubmit,
}: Omit<AddThreadsToBooklistModalProps, "isOpen">) {
  const [rawIds, setRawIds] = useState("");
  const [comment, setComment] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [participatedAt, setParticipatedAt] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const parsedIds = useMemo(() => parseThreadIds(rawIds), [rawIds]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="add-threads-to-booklist-title"
      className="fixed inset-0 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-(--od-text-primary) backdrop:bg-transparent backdrop-blur-xs"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="od-floating-panel-solid w-full max-w-lg rounded-xl border border-(--od-border) shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-(--od-border) px-5 py-4">
          <h2 id="add-threads-to-booklist-title" className="text-base font-bold text-(--od-text-primary)">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-(--od-text-tertiary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-(--od-text-secondary)">
              Thread ID 列表（逗号/空格/换行分隔）
            </label>
            <textarea
              value={rawIds}
              onChange={(e) => setRawIds(e.target.value)}
              rows={6}
              placeholder="123456789012345678\n987654321098765432"
              className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
            />
            <p className="mt-1 text-xs text-(--od-text-tertiary)">
              可解析 {parsedIds.length} 个 ID
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-(--od-text-secondary)">
              {commentLabel}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
            />
          </div>

          {enableTournamentFields && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-(--od-text-secondary)">
                参赛时间（可选）
              </label>
              <input
                type="datetime-local"
                value={participatedAt}
                onChange={(e) => setParticipatedAt(e.target.value)}
                className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-(--od-text-secondary)">
              起始排序权重（可选）
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
            />
          </div>

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
              disabled={submitting || parsedIds.length === 0}
              onClick={() => {
                const orderStart = Number.parseInt(displayOrder, 10);
                const hasOrder = Number.isFinite(orderStart);
                const items = parsedIds.map((id, index) => ({
                  thread_id: id,
                  comment: comment.trim() || undefined,
                  display_order: hasOrder ? orderStart + index : undefined,
                  tournament_participated_at:
                    enableTournamentFields && participatedAt
                      ? fromDateTimeLocal(participatedAt)
                      : undefined,
                }));
                onSubmit(items);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-(--od-accent) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--od-accent-hover) disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
