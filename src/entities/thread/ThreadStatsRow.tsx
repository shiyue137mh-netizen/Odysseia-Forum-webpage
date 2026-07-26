import { Eye, MessageCircle, ThumbsUp } from "lucide-react";

import type { Thread } from "@/entities/thread/types";

interface ThreadStatsRowProps {
  thread: Thread;
  variant: "card" | "list";
}

/**
 * 浏览 / 回复 / 点赞统计三件套。
 * card：三等分网格，浏览在前；list：紧凑行内排列，回复在前。
 */
export function ThreadStatsRow({ thread, variant }: ThreadStatsRowProps) {
  if (variant === "card") {
    const items = [
      { Icon: Eye, value: thread.display_count, title: "浏览量" },
      { Icon: MessageCircle, value: thread.reply_count, title: "回复数" },
      { Icon: ThumbsUp, value: thread.reaction_count, title: "点赞数" },
    ];

    return (
      <div className="mt-auto grid grid-cols-3 gap-2 text-(--od-text-tertiary)">
        {items.map(({ Icon, value, title }) => (
          <span
            key={title}
            className="inline-flex min-w-0 items-center gap-1 text-[11px]"
            title={title}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate text-[clamp(9px,1.8vw,11px)] font-medium tabular-nums">
              {value}
            </span>
          </span>
        ))}
      </div>
    );
  }

  const items = [
    { Icon: MessageCircle, value: thread.reply_count },
    { Icon: ThumbsUp, value: thread.reaction_count },
    { Icon: Eye, value: thread.display_count },
  ];

  return (
    <div className="flex items-center gap-3 text-[11px] text-(--od-text-tertiary) md:text-xs">
      {items.map(({ Icon, value }, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 transition-colors group-hover:text-(--od-text-secondary)"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}
