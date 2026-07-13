import type {
  SearchSuggestionAuthor,
  SearchSuggestionBooklist as ApiSearchSuggestionBooklist,
  SearchSuggestionThread,
} from "@/features/search/api/searchApi";
import {
  BookOpen,
  Clock,
  FileText,
  Flame,
  Hash,
  History,
  Minus,
  MessageCircle,
  Plus,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  describeSearchHistoryContext,
  type SearchHistoryItem,
} from "@/shared/lib/searchHistory";
import { LazyImage } from "@/shared/ui/LazyImage";
import { tokenizeSearchPayload } from "@/shared/lib/searchTokenizer";

export type SearchSuggestionAction =
  | { type: "append"; value: string }
  | {
      type: "add_token";
      tokenType: "tag" | "author";
      value: string;
      mode: "include" | "exclude";
    }
  | { type: "replace_query"; value: string; submit?: boolean }
  | { type: "apply_history"; item: SearchHistoryItem }
  | {
      type: "open_thread";
      threadId: string;
    }
  | { type: "open_booklist"; booklistId: number };

interface SearchSuggestionsProps {
  currentQuery: string;
  availableTags?: string[];
  channels?: Array<{ id: string; name: string }>;
  authors?: SearchSuggestionAuthor[];
  threads?: SearchSuggestionThread[];
  booklists?: ApiSearchSuggestionBooklist[];
  history?: SearchHistoryItem[];
  suggestedTags?: string[];
  onSelect: (action: SearchSuggestionAction) => void;
  onClose: () => void;
  onRemoveHistory?: (item: SearchHistoryItem) => void;
  onClearHistory?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  embedded?: boolean;
  preferenceAware?: boolean;
}

export function SearchSuggestions({
  currentQuery,
  availableTags = [],
  channels = [],
  authors = [],
  threads = [],
  booklists = [],
  history = [],
  suggestedTags = [],
  onSelect,
  onClose,
  onRemoveHistory,
  onClearHistory,
  inputRef,
  embedded = false,
  preferenceAware = false,
}: SearchSuggestionsProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const randomTags = useMemo(() => {
    if (availableTags.length === 0) return [];
    const shuffled = [...availableTags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [availableTags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputRef, onClose]);

  type SuggestionItem =
    | {
        key: string;
        type: "history";
        display: string;
        query: string;
        icon: typeof Clock;
        historyItem: SearchHistoryItem;
      }
    | {
        key: string;
        type: "tag" | "channel" | "author";
        display: string;
        value: string;
        icon: typeof Hash | typeof MessageCircle | typeof User | typeof Flame;
        avatar?: string | null;
      }
    | {
        key: string;
        type: "thread";
        display: string;
        threadId: string;
        icon: typeof FileText;
      }
    | {
        key: string;
        type: "booklist";
        display: string;
        booklistId: number;
        icon: typeof BookOpen;
        itemCount?: number;
      };

  const queryText = tokenizeSearchPayload(currentQuery).text;
  const isZeroState = !queryText;

  const groups = useMemo(() => {
    const queryLower = queryText.toLowerCase();
    const existingTags = currentQuery.match(/\$tag:([^$]+)\$/g) || [];
    const existingTagNames = existingTags
      .map((token) => token.match(/\$tag:([^$]+)\$/)?.[1] || "")
      .filter(Boolean);

    const flatItems: SuggestionItem[] = [];
    const sectionedGroups: Array<{
      title: string;
      icon: any;
      items: SuggestionItem[];
    }> = [];

    if (isZeroState) {
      const historyItems: SuggestionItem[] = history
        .slice(0, 5)
        .map((item, index) => ({
          key: `history-${item.id || item.timestamp}-${index}`,
          type: "history",
          display: item.query,
          query: item.query,
          icon: Clock,
          historyItem: item,
        }));

      if (historyItems.length > 0) {
        sectionedGroups.push({
          title: "历史搜索",
          icon: History,
          items: historyItems,
        });
        flatItems.push(...historyItems);
      }

      const tagSource = suggestedTags.length > 0 ? suggestedTags : randomTags;
      const popularTags: SuggestionItem[] = tagSource
        .slice(0, 5)
        .map((tag, index) => ({
          key: `tag-pop-${tag}-${index}`,
          type: "tag",
          display: tag,
          value: tag,
          icon: Flame,
        }));

      if (popularTags.length > 0) {
        sectionedGroups.push({
          title: "猜你想搜",
          icon: Flame,
          items: popularTags,
        });
        flatItems.push(...popularTags);
      }
    } else {
      const relevantAuthors: SuggestionItem[] = authors
        .slice(0, 5)
        .map((author, index) => ({
          key: `author-${author.id}-${index}`,
          type: "author",
          display: author.display_name || author.name,
          value: author.id,
          avatar: author.avatar_url,
          icon: User,
        }));
      if (relevantAuthors.length > 0) {
        sectionedGroups.push({
          title: "匹配作者",
          icon: User,
          items: relevantAuthors,
        });
        flatItems.push(...relevantAuthors);
      }

      const directThreads: SuggestionItem[] = threads
        .slice(0, 5)
        .map((thread, index) => ({
          key: `thread-${thread.thread_id}-${index}`,
          type: "thread",
          display: thread.title,
          threadId: thread.thread_id,
          icon: FileText,
        }));
      if (directThreads.length > 0) {
        sectionedGroups.push({
          title: "帖子直达",
          icon: FileText,
          items: directThreads,
        });
        flatItems.push(...directThreads);
      }

      const directBooklists: SuggestionItem[] = booklists
        .slice(0, 5)
        .map((booklist, index) => ({
          key: `booklist-${booklist.id}-${index}`,
          type: "booklist",
          display: booklist.title,
          booklistId: booklist.id,
          itemCount: booklist.item_count,
          icon: BookOpen,
        }));
      if (directBooklists.length > 0) {
        sectionedGroups.push({
          title: "书单直达",
          icon: BookOpen,
          items: directBooklists,
        });
        flatItems.push(...directBooklists);
      }

      const relevantTags: SuggestionItem[] = availableTags
        .filter(
          (tag) =>
            !existingTagNames.includes(tag) &&
            tag.toLowerCase().includes(queryLower),
        )
        .slice(0, 5)
        .map((tag, index) => ({
          key: `tag-${tag}-${index}`,
          type: "tag",
          display: tag,
          value: tag,
          icon: Hash,
        }));
      if (relevantTags.length > 0) {
        sectionedGroups.push({
          title: "相关标签",
          icon: Hash,
          items: relevantTags,
        });
        flatItems.push(...relevantTags);
      }

      const relevantChannels: SuggestionItem[] = channels
        .filter((channel) => channel.name.toLowerCase().includes(queryLower))
        .slice(0, 5)
        .map((channel, index) => ({
          key: `channel-${channel.id}-${index}`,
          type: "channel",
          display: channel.name,
          value: ` $channel:${channel.id}$`,
          icon: MessageCircle,
        }));
      if (relevantChannels.length > 0) {
        sectionedGroups.push({
          title: "频道直达",
          icon: MessageCircle,
          items: relevantChannels,
        });
        flatItems.push(...relevantChannels);
      }
    }

    return { sectionedGroups, flatItems };
  }, [
    authors,
    availableTags,
    booklists,
    channels,
    currentQuery,
    history,
    isZeroState,
    randomTags,
    queryText,
    suggestedTags,
    threads,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < groups.flatItems.length - 1 ? prev + 1 : prev,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (event.key === "Enter" && selectedIndex >= 0) {
        event.preventDefault();
        handleSelect(groups.flatItems[selectedIndex]);
      } else if (event.key === "Escape") {
        onClose();
      }
    };

    inputRef?.current?.addEventListener("keydown", handleKeyDown);
    return () =>
      inputRef?.current?.removeEventListener("keydown", handleKeyDown);
  }, [groups.flatItems, inputRef, onClose, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [currentQuery]);

  const handleSelect = (
    item: SuggestionItem,
    mode: "include" | "exclude" = "include",
  ) => {
    if (item.type === "thread") {
      onSelect({
        type: "open_thread",
        threadId: item.threadId,
      });
      return;
    }

    if (item.type === "booklist") {
      onSelect({ type: "open_booklist", booklistId: item.booklistId });
      return;
    }

    if (item.type === "history") {
      onSelect({ type: "apply_history", item: item.historyItem });
      return;
    }

    if (item.type === "tag" || item.type === "author") {
      onSelect({
        type: "add_token",
        tokenType: item.type,
        value: item.value,
        mode,
      });
      return;
    }

    onSelect({ type: "append", value: item.value });
  };

  const content = (
    <>
      {groups.flatItems.length === 0 ? (
        <div className="p-4 text-sm text-(--od-text-tertiary)">
          暂无联想结果，继续输入更多关键词试试。
        </div>
      ) : (
<div id="search-suggestions-listbox" role="listbox" className="max-h-[420px] overflow-y-auto p-2">
        {groups.sectionedGroups.map((group, groupIndex) => (
          <div
            key={group.title}
            className={`${groupIndex > 0 ? "mt-2 border-t border-(--od-border) pt-2" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-od-xs font-od-bold text-(--od-text-tertiary)">
                <group.icon className="h-3.5 w-3.5" />
                {group.title}
              </div>
              {group.title === "历史搜索" && history.length > 0 && (
                <button
                  onClick={() => onClearHistory?.()}
                  className="text-od-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-error)"
                >
                  清空
                </button>
              )}
            </div>
            <div role="group" aria-label={group.title} className="space-y-1">
              {group.items.map((item) => {
                const globalIndex = groups.flatItems.findIndex(
                  (candidate) => candidate.key === item.key,
                );
                const isSelected = selectedIndex === globalIndex;

                return (
                  <div
                    key={item.key}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelect(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSelect(item);
                      }
                    }}
                    className={`group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-(--od-accent)/20 text-(--od-text-primary)"
                        : "text-(--od-text-secondary) hover:bg-(--od-bg-tertiary)"
                    }`}
                  >
                    {item.type === "thread" || item.type === "booklist" ? (
                      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-(--od-bg-tertiary) text-(--od-text-tertiary)">
                          {item.type === "booklist" ? (
                            <BookOpen className="h-3.5 w-3.5" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <span className="truncate text-sm font-medium text-(--od-text-primary)">
                          {item.display}
                        </span>
                        {item.type === "booklist" && item.itemCount != null && (
                          <span className="shrink-0 text-[11px] text-(--od-text-tertiary)">
                            {item.itemCount}篇
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                        {item.type === "author" && item.avatar ? (
                          <LazyImage
                            src={item.avatar}
                            alt={item.display}
                            className="h-5 w-5 shrink-0 rounded-full"
                          />
                        ) : (
                          <item.icon
                            className={`h-4 w-4 shrink-0 ${
                              isSelected
                                ? "text-(--od-accent)"
                                : "text-(--od-text-tertiary)"
                            }`}
                          />
                        )}
                        <span className="truncate text-sm font-medium">
                          {item.display}
                        </span>
                        {item.type === "history" &&
                          describeSearchHistoryContext(item.historyItem) && (
                            <span className="truncate text-[11px] text-(--od-text-tertiary)">
                              {describeSearchHistoryContext(item.historyItem)}
                            </span>
                          )}
                      </div>
                    )}

                    {(item.type === "tag" || item.type === "author") && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSelect(item, "include");
                          }}
                          aria-label={`包含${item.type === "author" ? "作者" : "标签"} ${item.display}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--od-text-tertiary) transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSelect(item, "exclude");
                          }}
                          aria-label={`排除${item.type === "author" ? "作者" : "标签"} ${item.display}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--od-text-tertiary) transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {item.type === "history" && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveHistory?.(item.historyItem);
                        }}
                        className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-(--od-card-hover)"
                      >
                        <X className="h-3.5 w-3.5 text-(--od-text-tertiary)" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}

      <div className="flex items-center justify-between border-t border-(--od-border) bg-(--od-bg-tertiary)/50 p-od-sm text-od-xs text-(--od-text-tertiary)">
        <div>
          {preferenceAware ? "智能搜索导航 · 建议已按偏好收束" : "智能搜索导航"}
        </div>
        <div className="flex items-center gap-od-sm">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-(--od-border) px-1 font-mono">
              ↑
            </kbd>
            <kbd className="rounded bg-(--od-border) px-1 font-mono">
              ↓
            </kbd>{" "}
            切换
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-(--od-border) px-1 font-mono">
              ↵
            </kbd>{" "}
            确认
          </span>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div ref={dropdownRef} className="w-full">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="od-floating-panel-solid absolute right-0 top-full z-50 mt-od-sm w-full origin-top overflow-hidden rounded-lg border border-(--od-border-strong) shadow-2xl sm:w-[560px]"
    >
      {content}
    </motion.div>
  );
}
