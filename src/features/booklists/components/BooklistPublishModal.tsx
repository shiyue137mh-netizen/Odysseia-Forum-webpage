import { FormEvent, useEffect, useState } from "react";
import { Link2, LoaderCircle, X } from "lucide-react";

interface BooklistPublishModalProps {
  isOpen: boolean;
  initialUrl?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (threadUrl: string) => void;
}

export function validateDiscordThreadUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "请粘贴 Discord 讨论帖链接";

  try {
    const url = new URL(trimmed);
    const isDiscordHost =
      url.hostname === "discord.com" ||
      url.hostname.endsWith(".discord.com") ||
      url.hostname === "discordapp.com" ||
      url.hostname.endsWith(".discordapp.com");
    const isThreadPath = /^\/channels\/\d+\/\d+(?:\/\d+)?\/?$/.test(
      url.pathname,
    );

    if (url.protocol !== "https:" || !isDiscordHost || !isThreadPath) {
      return "请输入完整的 Discord 讨论帖链接";
    }
  } catch {
    return "请输入有效的链接";
  }

  return null;
}

export function normalizeDiscordThreadUrl(value: string): string {
  const url = new URL(value.trim());
  const [, guildId, threadId] = url.pathname.split("/").filter(Boolean);
  url.pathname = `/channels/${guildId}/${threadId}/`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function BooklistPublishModal({
  isOpen,
  initialUrl,
  submitting = false,
  onClose,
  onSubmit,
}: BooklistPublishModalProps) {
  const [threadUrl, setThreadUrl] = useState(initialUrl || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setThreadUrl(initialUrl || "");
    setError(null);
  }, [initialUrl, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateDiscordThreadUrl(threadUrl);
    setError(validationError);
    if (validationError) return;
    // 规范化 URL：仅在链接包含消息 ID 时移除第三个 ID。
    onSubmit(normalizeDiscordThreadUrl(threadUrl));
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booklist-publish-title"
      onClick={() => !submitting && onClose()}
    >
      <form
        className="od-floating-panel-solid w-full max-w-lg rounded-2xl border border-(--od-border) p-6 shadow-2xl"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-(--od-text-tertiary)">
              Discord
            </p>
            <h2
              id="booklist-publish-title"
              className="text-xl font-semibold text-(--od-text-primary)"
            >
              关联讨论帖
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary) disabled:opacity-50"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-(--od-text-secondary)">
          在书单区创建讨论帖，并复制讨论帖链接到此处以进行关联。
          <br />
          注：关联讨论帖的帖主需是自己，否则会关联失败
        </p>

        <label className="mt-5 block text-sm font-medium text-(--od-text-primary)">
          讨论帖链接
          <div
            className={`mt-2 flex items-center gap-2 rounded-xl border bg-(--od-bg-secondary) px-3 transition-colors focus-within:border-(--od-accent) ${
              error ? "border-(--od-error)" : "border-(--od-border)"
            }`}
          >
            <Link2 className="h-4 w-4 shrink-0 text-(--od-text-tertiary)" />
            <input
              type="url"
              value={threadUrl}
              onChange={(event) => {
                setThreadUrl(event.target.value);
                if (error) setError(null);
              }}
              placeholder="https://discord.com/channels/.../..."
              autoFocus
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "booklist-publish-error" : undefined}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
            />
          </div>
        </label>
        {error && (
          <p id="booklist-publish-error" className="mt-2 text-xs text-(--od-error)">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary) disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-(--od-accent) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--od-accent-hover) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {submitting ? "提交中…" : "确认关联"}
          </button>
        </div>
      </form>
    </div>
  );
}
