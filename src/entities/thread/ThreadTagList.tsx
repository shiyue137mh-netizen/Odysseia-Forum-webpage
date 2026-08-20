import { ThreadAchievementTag } from "@/entities/thread/ThreadAchievementTag";
import { ThreadTagItem } from "@/entities/thread/ThreadTagItem";
import type { Thread } from "@/entities/thread/types";

interface ThreadTagListProps {
  thread: Thread;
  /** 由 useThreadCardModel 提供：virtual_tags 中未与实体标签重复的部分 */
  virtualOnlyTags: string[];
  onTagClick?: (tag: string) => void;
  variant: "card" | "list";
}

/**
 * 成就标记 + 实体标签 + 虚拟标签的统一渲染。
 * card：胶囊按钮，最多 3 个实体标签；list：#文本按钮，最多 4 个。
 * 支持左键快速搜索、右键/长按弹出专属菜单（包含、排除、偏好屏蔽、复制）。
 */
export function ThreadTagList({
  thread,
  virtualOnlyTags,
  onTagClick,
  variant,
}: ThreadTagListProps) {
  const handleTagClick = (tag: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onTagClick?.(tag);
  };

  if (variant === "card") {
    const hasContent =
      thread.reaction_count >= 100 ||
      thread.tags.length > 0 ||
      virtualOnlyTags.length > 0;
    if (!hasContent) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        <ThreadAchievementTag
          reactionCount={thread.reaction_count}
          variant="card"
        />
        {thread.tags.slice(0, 3).map((tag) => (
          <ThreadTagItem
            key={tag}
            tag={tag}
            onClick={handleTagClick(tag)}
            className="rounded-md border border-(--od-border)/30 bg-(--od-surface-raised)/60 px-2 py-0.5 text-[10px] text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-raised) hover:text-(--od-text-primary)"
            variant="card"
          />
        ))}
        {thread.tags.length > 3 && (
          <span className="rounded-md border border-(--od-border)/30 bg-(--od-surface-raised)/60 px-2 py-0.5 text-[10px] text-(--od-text-secondary)">
            +{thread.tags.length - 3}
          </span>
        )}
        {virtualOnlyTags.slice(0, 2).map((tag) => (
          <ThreadTagItem
            key={`vt-${tag}`}
            tag={tag}
            isVirtual
            onClick={handleTagClick(tag)}
            className="rounded-md border border-cyan-200/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-500"
            variant="card"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-(--od-text-tertiary) md:text-xs">
      <ThreadAchievementTag
        reactionCount={thread.reaction_count}
        variant="list"
      />
      {thread.tags?.slice(0, 4).map((tag) => (
        <ThreadTagItem
          key={tag}
          tag={tag}
          onClick={handleTagClick(tag)}
          className="truncate transition-colors hover:text-(--od-text-primary)"
          variant="list"
        />
      ))}
      {thread.tags && thread.tags.length > 4 && (
        <span>+{thread.tags.length - 4}</span>
      )}
      {virtualOnlyTags.slice(0, 2).map((tag) => (
        <ThreadTagItem
          key={`vt-${tag}`}
          tag={tag}
          isVirtual
          onClick={handleTagClick(tag)}
          className="text-(--od-text-emphasis) transition-colors hover:text-(--od-text-primary)"
          variant="list"
        />
      ))}
    </div>
  );
}
