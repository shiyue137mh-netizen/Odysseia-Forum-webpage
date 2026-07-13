import { EyeOff, Heart, RotateCcw, Settings2 } from "lucide-react";

interface PreferenceFilterNoticeProps {
  ignored?: boolean;
  message?: string;
  onIgnore: () => void;
  onRestore: () => void;
  onOpenSettings: () => void;
}

const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-accent) focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)";

export function PreferenceFilterNotice({
  ignored = false,
  message = "当前内容已按你的探索偏好筛选。",
  onIgnore,
  onRestore,
  onOpenSettings,
}: PreferenceFilterNoticeProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs text-(--od-text-secondary)">
      <span className="inline-flex min-w-0 items-center gap-2">
        <Heart className="h-3.5 w-3.5 shrink-0 text-(--od-accent)" />
        <span>{ignored ? "当前已暂时忽略探索偏好。" : message}</span>
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={ignored ? onRestore : onIgnore}
          className={iconButtonClass}
          aria-label={ignored ? "恢复偏好过滤" : "暂时忽略偏好过滤"}
          title={ignored ? "恢复偏好过滤" : "暂时忽略偏好过滤"}
        >
          {ignored ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className={iconButtonClass}
          aria-label="调整探索偏好"
          title="调整探索偏好"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}
