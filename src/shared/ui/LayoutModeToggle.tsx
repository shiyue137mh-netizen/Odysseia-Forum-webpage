import { Columns3, LayoutGrid, Rows3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LayoutMode } from "@/shared/hooks/useLayoutPreference";

const OPTIONS: Array<{
  mode: LayoutMode;
  label: string;
  title: string;
  ariaLabel: string;
  Icon: LucideIcon;
}> = [
  {
    mode: "masonry",
    label: "瀑布",
    title: "瀑布流展示（实验性）",
    ariaLabel: "切换到实验性瀑布流展示",
    Icon: Columns3,
  },
  {
    mode: "list",
    label: "列表",
    title: "列表展示",
    ariaLabel: "切换到列表展示",
    Icon: Rows3,
  },
  {
    mode: "grid",
    label: "网格",
    title: "网格展示",
    ariaLabel: "切换到网格展示",
    Icon: LayoutGrid,
  },
];

interface LayoutModeToggleProps {
  /** 当前高亮的布局；调用方如需把 masonry 视作 grid，请传换算后的值 */
  value: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  /** 是否展示实验性瀑布流选项（目前仅搜索页帖子标签页启用） */
  showMasonry?: boolean;
  className?: string;
}

/** 列表 / 网格（/ 瀑布流）布局切换胶囊按钮组。 */
export function LayoutModeToggle({
  value,
  onChange,
  showMasonry = false,
  className = "",
}: LayoutModeToggleProps) {
  const options = showMasonry
    ? OPTIONS
    : OPTIONS.filter((option) => option.mode !== "masonry");

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_76%,transparent)] p-1 ${className}`.trim()}
    >
      {options.map(({ mode, label, title, ariaLabel, Icon }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === mode
              ? "bg-(--od-accent) text-white"
              : "text-(--od-text-secondary) hover:text-(--od-text-primary)"
          }`}
          aria-label={ariaLabel}
          title={title}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
