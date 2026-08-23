import {
  BellOff,
  Bookmark,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";

import { ThreadListItem } from "@/features/threads/components/ThreadListItem";
import type { FollowedThread, Thread } from "@/entities/thread/types";
import type { FollowSort } from "@/features/follows/lib/sortFollows";
import { useListEntranceAnimation } from "@/shared/hooks/useListEntranceAnimation";

type FollowStatusFilter = "current" | "past" | "all";

type FollowChannelOption = {
  id: string;
  name: string;
};

interface MeFollowsSectionProps {
  channelOptions: FollowChannelOption[];
  followStatus: FollowStatusFilter;
  hasAnyResults: boolean;
  isError: boolean;
  isLoading: boolean;
  selectedChannel?: string | null;
  searchQuery: string;
  sort: FollowSort;
  threads: FollowedThread[];
  onClearChannel: () => void;
  onPreview: (thread: Thread) => void;
  onRefresh: () => void;
  onSearchQueryChange: (value: string) => void;
  onSortChange: (sort: FollowSort) => void;
  onSetChannel: (channelId: string | null) => void;
  onSetFollowStatus: (status: FollowStatusFilter) => void;
  onUnfollow: (thread: Thread) => void;
  unfollowPendingThreadId?: string | null;
}

export function MeFollowsSection({
  channelOptions,
  followStatus,
  hasAnyResults,
  isError,
  isLoading,
  selectedChannel,
  searchQuery,
  sort,
  threads,
  onClearChannel,
  onPreview,
  onRefresh,
  onSearchQueryChange,
  onSortChange,
  onSetChannel,
  onSetFollowStatus,
  onUnfollow,
  unfollowPendingThreadId,
}: MeFollowsSectionProps) {
  const animateIn = useListEntranceAnimation(isLoading);

  const emptyMessage = selectedChannel
    ? "这个频道里暂时没有符合筛选的关注内容。"
    : followStatus === "past"
      ? "还没有历史关注记录。"
      : followStatus === "all"
        ? "还没有关注记录，去 Discord 里参与帖子后会自动出现在这里。"
        : "还没有当前关注内容，去 Discord 里参与帖子后会自动出现在这里。";

  return (
    <section className="px-1">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Bookmark className="h-4 w-4 text-(--od-accent)" />
          <h2 className="od-text-title">我的关注</h2>
        </div>
        <div className="w-full max-w-xs">
          <label htmlFor="follow-search" className="sr-only">
            搜索已加载的关注内容
          </label>
          <div className="mb-3 flex min-h-10 items-center gap-2 border-b border-(--od-shell-line) px-1">
            <Search className="h-4 w-4 shrink-0 text-(--od-text-tertiary)" />
            <input
              id="follow-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="搜索当前已加载的关注"
              className="min-w-0 flex-1 !bg-transparent py-2 text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
            />
          </div>
          <label htmlFor="follow-channel-filter" className="sr-only">
            频道筛选
          </label>
          <select
            id="follow-channel-filter"
            value={selectedChannel || ""}
            onChange={(event) => onSetChannel(event.target.value || null)}
            className="od-ghost-input min-h-10 w-full px-1 text-sm"
          >
            <option value="">全频道</option>
            {channelOptions.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
          <label htmlFor="follow-sort" className="sr-only">
            关注排序
          </label>
          <select
            id="follow-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as FollowSort)}
            className="od-ghost-input mt-2 min-h-10 w-full px-1 text-sm"
          >
            <option value="updated">最近更新</option>
            <option value="unread">有更新优先</option>
            <option value="followed-newest">最近关注</option>
            <option value="followed-oldest">最早关注</option>
            <option value="created">最近创建</option>
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
              onClick={() => onSetFollowStatus(option.value)}
              className={`od-inline-action ${
                followStatus === option.value
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
          {selectedChannel && (
            <button
              type="button"
              onClick={onClearChannel}
              className="od-inline-action od-inline-action-soft"
            >
              清除频道筛选
            </button>
          )}
        </div>
      </div>

      {selectedChannel && (
        <p className="mb-5 text-center text-sm leading-6 text-(--od-text-secondary)">
          现在只在当前频道里看关注内容，侧栏切频道会直接刷新这里的范围。
        </p>
      )}

      {isLoading ? (
        <p className="od-text-body">正在加载关注列表...</p>
      ) : isError ? (
        <p className="od-text-body text-(--od-text-emphasis)">
          关注列表加载失败了，稍后试试看。
        </p>
      ) : !hasAnyResults ? (
        <p className="od-text-body">{emptyMessage}</p>
      ) : threads.length === 0 ? (
        <p className="od-text-body">
          {searchQuery.trim()
            ? "当前已加载的关注内容里没有匹配结果。"
            : emptyMessage}
        </p>
      ) : (
        <div className="flex flex-col space-y-od-list-gap">
          {threads.map((thread, index) => {
            const isCurrentFollow = Boolean(thread.active_flag);
            const isPending = unfollowPendingThreadId === thread.thread_id;

            return (
              <div key={thread.thread_id} className="relative md:pr-36">
                <ThreadListItem
                  thread={thread}
                  index={index}
                  onPreview={onPreview}
                  animateIn={animateIn}
                />
                <div className="mt-2 flex justify-end md:absolute md:right-0 md:top-3 md:mt-0">
                  {isCurrentFollow ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onUnfollow(thread)}
                      className="od-inline-action od-inline-action-ghost text-(--od-text-tertiary) hover:text-(--od-error) disabled:pointer-events-none disabled:opacity-55"
                    >
                      <BellOff className="h-3.5 w-3.5" />
                      {isPending ? "取消中" : "取消关注"}
                    </button>
                  ) : (
                    <span className="od-inline-action bg-(--od-surface-soft) text-(--od-text-tertiary)">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      已取消
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
