import {
  BellOff,
  BellPlus,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import type { AuthorFollowItem } from "@/features/follows/api/authorFollowsApi";
import { useToggleAuthorFollow } from "@/features/follows/hooks/useAuthorFollow";
import {
  getAuthorFollowName,
  sortAuthorFollows,
  type AuthorFollowSort,
} from "@/features/follows/lib/sortAuthorFollows";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";

export type AuthorFollowStatusFilter = "current" | "past" | "all";

interface MeAuthorFollowsSectionProps {
  hasNextPage: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  items: AuthorFollowItem[];
  status: AuthorFollowStatusFilter;
  total: number;
  onLoadMore: () => void;
  onOpenAuthor: (authorId: string) => void;
  onRefresh: () => void;
  onSetStatus: (status: AuthorFollowStatusFilter) => void;
}

function AuthorFollowListItem({
  item,
  onOpenAuthor,
}: {
  item: AuthorFollowItem;
  onOpenAuthor: (authorId: string) => void;
}) {
  const name = getAuthorFollowName(item);
  const toggleFollow = useToggleAuthorFollow(String(item.author.id), item.active);

  return (
    <article className="relative flex items-center gap-3 py-3 sm:gap-4">
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--od-divider-strong)_60%,transparent),transparent)]" />
      <button
        type="button"
        onClick={() => onOpenAuthor(String(item.author.id))}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
        aria-label={`前往 ${name} 的作者页`}
      >
        <AuthorAvatar author={item.author} className="h-11 w-11 sm:h-12 sm:w-12" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-(--od-text-primary)">
            {name}
          </span>
          <span className="mt-1 block truncate text-xs text-(--od-text-tertiary)">
            @{item.author.name} · {formatRelativeDateTime(item.followed_at)}关注
          </span>
        </span>
      </button>

      <button
        type="button"
        disabled={toggleFollow.isPending}
        onClick={() => toggleFollow.mutate()}
        className={`od-inline-action shrink-0 disabled:pointer-events-none disabled:opacity-55 ${
          item.active
            ? "od-inline-action-ghost text-(--od-text-tertiary) hover:text-(--od-error)"
            : "od-inline-action-soft"
        }`}
      >
        {toggleFollow.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : item.active ? (
          <BellOff className="h-3.5 w-3.5" />
        ) : (
          <BellPlus className="h-3.5 w-3.5" />
        )}
        {toggleFollow.isPending
          ? "处理中"
          : item.active
            ? "取消关注"
            : "重新关注"}
      </button>
    </article>
  );
}

export function MeAuthorFollowsSection({
  hasNextPage,
  isError,
  isFetchingNextPage,
  isLoading,
  items,
  status,
  total,
  onLoadMore,
  onOpenAuthor,
  onRefresh,
  onSetStatus,
}: MeAuthorFollowsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<AuthorFollowSort>("followed-newest");
  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const filteredItems = query
      ? items.filter((item) =>
          [
            getAuthorFollowName(item),
            item.author.name,
            item.author.global_name,
            item.author.display_name,
          ]
            .filter(Boolean)
            .join("\n")
            .toLocaleLowerCase()
            .includes(query),
        )
      : items;

    return sortAuthorFollows(filteredItems, sort);
  }, [items, searchQuery, sort]);

  const emptyMessage =
    status === "past"
      ? "还没有已取消的作者关注记录。"
      : status === "all"
        ? "还没有关注过作者。"
        : "还没有关注作者，可以在作者页或作者悬浮卡片中关注。";

  return (
    <section aria-label="关注作者">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="w-full max-w-xs">
          <label htmlFor="author-follow-search" className="sr-only">
            搜索已加载的关注作者
          </label>
          <div className="mb-3 flex min-h-10 items-center gap-2 border-b border-(--od-shell-line) px-1">
            <Search className="h-4 w-4 shrink-0 text-(--od-text-tertiary)" />
            <input
              id="author-follow-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索当前已加载的作者"
              className="min-w-0 flex-1 !bg-transparent py-2 text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
            />
          </div>
          <label htmlFor="author-follow-sort" className="sr-only">
            作者关注排序
          </label>
          <select
            id="author-follow-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as AuthorFollowSort)}
            className="od-ghost-input min-h-10 w-full px-1 text-sm"
          >
            <option value="followed-newest">最近关注</option>
            <option value="followed-oldest">最早关注</option>
            <option value="name-asc">作者名称 A–Z</option>
            <option value="name-desc">作者名称 Z–A</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {(
            [
              { value: "current", label: "当前关注" },
              { value: "past", label: "历史关注" },
              { value: "all", label: "全部" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSetStatus(option.value)}
              className={`od-inline-action ${
                status === option.value
                  ? "od-inline-action-soft"
                  : "od-inline-action-ghost"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onRefresh}
            className="od-inline-action od-inline-action-ghost"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="od-text-body">正在加载关注作者...</p>
      ) : isError ? (
        <p className="od-text-body text-(--od-text-emphasis)">
          作者关注列表加载失败了，稍后试试看。
        </p>
      ) : items.length === 0 ? (
        <p className="od-text-body">{emptyMessage}</p>
      ) : visibleItems.length === 0 ? (
        <p className="od-text-body">当前已加载的作者里没有匹配结果。</p>
      ) : (
        <>
          <div className="mb-3 text-center text-xs text-(--od-text-tertiary)">
            已加载 {items.length} / {total} 位作者
          </div>
          <div className="flex flex-col">
            {visibleItems.map((item) => (
              <AuthorFollowListItem
                key={item.author.id}
                item={item}
                onOpenAuthor={onOpenAuthor}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={isFetchingNextPage}
                onClick={onLoadMore}
                className="od-inline-action od-inline-action-soft disabled:pointer-events-none disabled:opacity-55"
              >
                {isFetchingNextPage && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isFetchingNextPage ? "加载中" : "加载更多"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
