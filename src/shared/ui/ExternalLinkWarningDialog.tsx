import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ExternalLinkWarningDialogProps {
  hostname: string;
  href: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExternalLinkWarningDialog({
  hostname,
  href,
  onCancel,
  onConfirm,
}: ExternalLinkWarningDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="od-floating-panel-solid fixed inset-0 z-3000 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-(--od-border) p-6 text-(--od-text-primary) shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-link-warning-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        const dialog = dialogRef.current;
        if (!dialog || event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const clickedBackdrop =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        if (clickedBackdrop) onCancel();
      }}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-(--od-text-tertiary)">
        外部链接提醒
      </p>
      <h2 id="external-link-warning-title" className="text-xl font-semibold text-(--od-text-primary)">
        即将离开 Odysseia / Discord 生态
      </h2>
      <p className="mt-3 text-sm leading-6 text-(--od-text-secondary)">
        这个链接指向站外页面。请确认目标站点可信后再继续访问。
      </p>
      <div className="mt-4 rounded-xl border border-(--od-border) bg-(--od-bg-secondary) px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-(--od-text-tertiary)">目标域名</p>
        <p className="mt-1 break-all text-sm font-medium text-(--od-text-primary)">{hostname}</p>
        <p className="mt-2 break-all text-xs text-(--od-text-tertiary)">{href}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-(--od-accent) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--od-accent-hover)"
        >
          继续前往
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
