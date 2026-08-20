import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select } from "@/shared/ui/Select";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { BooklistCard } from "@/entities/booklist/BooklistCard";
import { BooklistListItem } from "@/entities/booklist/BooklistListItem";
import type { Booklist } from "@/entities/booklist/types";
import {
  useBooklistsList,
  useCreateBooklist,
  useDeleteBooklist,
  useToggleBooklistCollection,
  useUpdateBooklist,
} from "@/features/booklists/hooks/useBooklistsData";
import { BooklistFormModal } from "@/features/booklists/components/BooklistFormModal";
import { AnimatedPagination } from "@/shared/ui/AnimatedPagination";
import { useBooklistURLParams } from "@/features/booklists/hooks/useBooklistURLParams";
import { useCardGridClass, useSettings } from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";

type BooklistScope = "public" | "mine" | "collected";

const scopeOptions: Array<{ key: BooklistScope; label: string }> = [
  { key: "public", label: "公开书单" },
  { key: "mine", label: "我的创建" },
  { key: "collected", label: "我的收藏" },
];

export function BooklistsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { params, setParams } = useBooklistURLParams();
  const { settings } = useSettings();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "booklists",
    settings.layoutMode,
  );
  const gridClass = useCardGridClass();

  const { scope, keywords, sort: sortMethod, page } = params;
  const pageIndex = page - 1;

  const [searchInput, setSearchInput] = useState(keywords);

  // 同步 URL 关键词到本地输入框
  useEffect(() => {
    setSearchInput(keywords);
  }, [keywords]);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Booklist | null>(null);

  const listQuery = useBooklistsList({
    scope,
    keywords: keywords || undefined,
    sortMethod,
    pageIndex,
    pageSize: 12,
    isTournament: false,
  });

  const createMutation = useCreateBooklist(() => setShowCreate(false));
  const updateMutation = useUpdateBooklist(undefined, () => setEditing(null));
  const deleteMutation = useDeleteBooklist();
  const collectMutation = useToggleBooklistCollection();

  const results = listQuery.data?.results ?? [];
  const normalizedResults = useMemo(
    () =>
      results.map((item) =>
        scope === "collected" ? { ...item, collected_flag: true } : item,
      ),
    [results, scope],
  );
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.limit ?? 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sortOptions = useMemo(
    () => [
      { value: 1, label: "按帖子数" },
      { value: 2, label: "按浏览数" },
      { value: 3, label: "按收藏数" },
      { value: 4, label: "按创建时间" },
      { value: 5, label: "按更新时间" },
      ...(scope === "collected" ? [{ value: 6, label: "按收藏时间" }] : []),
    ],
    [scope],
  );

  useEffect(() => {
    if (totalPages > 1) {
      window.dispatchEvent(
        new CustomEvent("odysseia:active-page-info", {
          detail: { currentPage: page, totalPages },
        }),
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("odysseia:active-page-info", {
          detail: null,
        }),
      );
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent("odysseia:active-page-info", {
          detail: null,
        }),
      );
    };
  }, [page, totalPages]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8 p-4 sm:p-6 lg:gap-10 lg:p-8">
      <section>
        <div className="flex flex-col gap-6">
          <div className="od-page-heading flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="od-page-title">书单</h1>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="od-inline-action od-inline-action-primary w-full justify-center sm:w-auto sm:self-start"
            >
              <Plus className="h-4 w-4" />
              新建书单
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {scopeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setParams({ scope: option.key, page: 1 });
                    }}
                    className={`od-pill-chip ${
                      scope === option.key
                        ? "bg-(--od-accent)/10 text-(--od-accent)"
                        : "text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-1">
              <div className="flex min-h-10 items-center gap-2 border-b border-(--od-border) px-1 focus-within:border-(--od-accent)">
                <Search className="h-4 w-4 text-(--od-text-tertiary)" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setParams({ keywords: searchInput, page: 1 });
                    }
                  }}
                  onBlur={() => {
                    setParams({ keywords: searchInput, page: 1 });
                  }}
                  placeholder="搜索书单标题或简介"
                  className="h-10 w-full bg-transparent text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
                />
              </div>

              <div className="flex min-h-10 items-center gap-2 px-1">
                <SlidersHorizontal className="h-4 w-4 text-(--od-text-tertiary)" />
                <Select
                  value={String(sortMethod)}
                  options={sortOptions.map((o) => ({
                    value: String(o.value),
                    label: o.label,
                  }))}
                  onChange={(v) => {
                    setParams({ sort: Number.parseInt(v, 10), page: 1 });
                  }}
                  variant="inline"
                />
              </div>

              <button
                type="button"
                onClick={() => listQuery.refetch()}
                className="od-inline-action od-inline-action-ghost justify-center"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <LayoutModeToggle value={layoutMode} onChange={setLayoutMode} />
          </div>
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="flex flex-col space-y-od-list-gap">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--od-border)_60%,transparent)] bg-(--od-surface-card) p-4"
            >
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-[1.1rem] bg-(--od-surface-content)" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-5 w-1/3 animate-pulse rounded bg-(--od-surface-content)" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-(--od-surface-content)" />
              </div>
            </div>
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="py-12 text-center text-sm text-(--od-text-secondary)">
          书单这边刚刚有点小迷糊，等一下再来，我会重新帮你拿一遍的。
        </div>
      ) : normalizedResults.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-base font-semibold text-(--od-text-primary)">
            暂无书单
          </p>
          <p className="mt-1 text-sm text-(--od-text-secondary)">
            {scope === "public"
              ? "现在还没有公开书单呢，要不要顺手做第一个呀？"
              : "这里还空着呢，你可以慢慢新建一个试试。"}
          </p>
        </div>
      ) : (
        <>
          <div
            className={
              layoutMode === "list"
                ? "flex flex-col space-y-od-list-gap"
                : gridClass
            }
          >
            {normalizedResults.map((booklist) => {
              const commonProps = {
                booklist,
                canManage: String(booklist.owner_id) === String(user?.id),
                onOpen: (id: number) => navigate(`/booklists/${id}`),
                onToggleCollect: (item: Booklist) =>
                  collectMutation.mutate({
                    id: item.id,
                    collected: Boolean(item.collected_flag),
                  }),
                onEdit: (item: Booklist) => setEditing(item),
                onDelete: (item: Booklist) => {
                  if (!window.confirm(`确认删除书单「${item.title}」？`))
                    return;
                  deleteMutation.mutate(item.id);
                },
                collectLoading: collectMutation.isPending,
              };

              return layoutMode === "list" ? (
                <BooklistListItem
                  key={booklist.id}
                  {...commonProps}
                  ownerName={
                    booklist.author?.display_name ||
                    booklist.author?.global_name ||
                    booklist.author?.name ||
                    undefined
                  }
                  ownerAvatarUrl={booklist.author?.avatar_url ?? null}
                  coverImageUrl={booklist.cover_image_url || null}
                />
              ) : (
                <BooklistCard key={booklist.id} {...commonProps} />
              );
            })}
          </div>

          <AnimatedPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            onChange={(newPage) => setParams({ page: newPage })}
          />
        </>
      )}

      <BooklistFormModal
        isOpen={showCreate}
        submitting={createMutation.isPending}
        onClose={() => setShowCreate(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <BooklistFormModal
        isOpen={Boolean(editing)}
        initialValue={editing}
        submitting={updateMutation.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => {
          if (!editing) return;
          updateMutation.mutate({ id: editing.id, payload });
        }}
      />
    </div>
  );
}
