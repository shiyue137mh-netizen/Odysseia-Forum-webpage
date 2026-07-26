import { useState } from "react";

import type { Thread } from "@/entities/thread/types";
import { useFontSizeSetting } from "@/shared/hooks/useSettings";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import { fontSizeMap } from "@/shared/lib/settings";

/**
 * ThreadCard 与 ThreadListItem 共用的派生值与展示状态。
 * 两个组件的布局各自独立，但"从 Thread 算出什么"必须一致，集中在这里。
 */
export function useThreadCardModel(thread: Thread, index = 0) {
  const fontSize = useFontSizeSetting();
  const fontSizes = fontSizeMap[fontSize];
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const createdTime = formatRelativeDateTime(thread.created_at);
  const lastActiveTime = thread.last_active_at
    ? formatRelativeDateTime(thread.last_active_at)
    : null;
  const virtualOnlyTags = (thread.virtual_tags || []).filter(
    (tag) => !thread.tags.includes(tag),
  );
  const hasExcerpt =
    !!thread.first_message_excerpt &&
    thread.first_message_excerpt.trim() !== "...";

  // 入场动画按列表位置错峰，24 个一轮避免长列表尾部等待过久
  const animationDelay = `${(index % 24) * 40}ms`;

  return {
    fontSize,
    fontSizes,
    quickAddOpen,
    setQuickAddOpen,
    createdTime,
    lastActiveTime,
    virtualOnlyTags,
    hasExcerpt,
    animationDelay,
  };
}
