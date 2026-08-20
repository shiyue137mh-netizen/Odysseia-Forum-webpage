import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteScrollTrigger } from "@/shared/hooks/useInfiniteScrollTrigger";
import { useListEntranceAnimation } from "@/shared/hooks/useListEntranceAnimation";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  ExternalLink,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Share2,
  Star,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import { ThreadCard } from "@/entities/thread/ThreadCard";
import { ThreadListItem } from "@/entities/thread/ThreadListItem";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { threadFromBooklistItem } from "@/entities/booklist/lib/threadFromBooklistItem";
import {
  useAddBooklistItems,
  useBooklistDetail,
  useBooklistItems,
  useDeleteBooklist,
  usePublishBooklist,
  useRemoveBooklistItems,
  useToggleBooklistCollection,
  useUnpublishBooklist,
  useUpdateBooklist,
  useUpdateBooklistItem,
} from "@/features/booklists/hooks/useBooklistsData";
import type { BooklistItem } from "@/entities/booklist/types";
import { BooklistFormModal } from "@/features/booklists/components/BooklistFormModal";
import { AddThreadsToBooklistModal } from "@/features/booklists/components/AddThreadsToBooklistModal";
import { BooklistItemEditorModal } from "@/features/booklists/components/BooklistItemEditorModal";
import { BooklistPublishModal } from "@/features/booklists/components/BooklistPublishModal";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import {
  buildBooklistShareText,
  copyTextToClipboard,
} from "@/shared/lib/shareText";
import { ShareTextDialog } from "@/shared/ui/ShareTextDialog";
import {
  useCardGridClass,
  useOpenModeSetting,
  useSettings,
} from "@/shared/hooks/useSettings";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";
import { PageStatusMessage } from "@/shared/ui/PageStatusMessage";
import { resolveDiscordPublishedMessageUrl } from "@/shared/lib/discord";
import { openDiscordWithFallback } from "@/features/threads/lib/openDiscordWithFallback";

export function BooklistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPreview } = usePreviewThread();
  const { settings } = useSettings();
  const openMode = useOpenModeSetting();
  const [layoutMode, setLayoutMode] = useLayoutPreference(
    "booklist-detail",
    settings.layoutMode,
  );
  const gridClass = useCardGridClass();

  const booklistId = String(id || "").trim();
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [clearPublishUrl, setClearPublishUrl] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [editingItem, setEditingItem] = useState<BooklistItem | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);

  const detailQuery = useBooklistDetail(booklistId);
  const itemsQuery = useBooklistItems(booklistId);

  const isOwner = useMemo(
    () => String(detailQuery.data?.owner_id ?? "") === String(user?.id ?? ""),
    [detailQuery.data?.owner_id, user?.id],
  );

  const items = useMemo(() => {
    return itemsQuery.data?.pages.flatMap((page) => page.results || []) ?? [];
  }, [itemsQuery.data]);

  const updateMutation = useUpdateBooklist(Number(booklistId), () =>
    setShowEdit(false),
  );
  const deleteMutation = useDeleteBooklist(() => navigate("/booklists"));
  const publishMutation = usePublishBooklist(booklistId, () =>
    setShowPublish(false),
  );
  const unpublishMutation = useUnpublishBooklist(booklistId);
  const collectMutation = useToggleBooklistCollection();
  const addItemsMutation = useAddBooklistItems(booklistId, () =>
    setShowAdd(false),
  );
  const removeItemMutation = useRemoveBooklistItems(booklistId);
  const updateItemMutation = useUpdateBooklistItem(booklistId, () =>
    setEditingItem(null),
  );

  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showMore) return;

    const closeMenu = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setShowMore(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMore(false);
    };

    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showMore]);

  // ─── 无限滚动触发器 ──────────────────────────────────────
  // 必须放在提前返回之前，遵循 Hooks 规则
  const loadMoreRef = useInfiniteScrollTrigger(itemsQuery);
  const animateIn = useListEntranceAnimation(
    detailQuery.isLoading || itemsQuery.isLoading,
  );

  if (!booklistId) {
    return <PageStatusMessage tone="error">无效书单 ID</PageStatusMessage>;
  }

  if (detailQuery.isLoading || itemsQuery.isLoading) {
    return <PageStatusMessage>正在帮你加载书单...</PageStatusMessage>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageStatusMessage tone="error">
        书单加载出错了，可能不存在或已经被删除了
      </PageStatusMessage>
    );
  }

  const booklist = detailQuery.data;
  const publishStatus = Number(booklist.publish_status);
  const publishInfo = booklist.publish_info;
  const webDiscussionUrl =
    publishInfo?.message_url || publishInfo?.thread_url || null;
  const discussionUrl = resolveDiscordPublishedMessageUrl({
    openMode,
    webUrl: webDiscussionUrl,
    guildId: publishInfo?.guild_id,
    threadId: publishInfo?.thread_id,
    messageId: publishInfo?.message_id,
  });
  const usesDiscordAppLink = discussionUrl?.startsWith("discord://") ?? false;
  const discussionLinkTarget = usesDiscordAppLink ? undefined : "_blank";
  const discussionLinkRel = usesDiscordAppLink
    ? undefined
    : "noopener noreferrer";
  const discussionLinkTitle = usesDiscordAppLink
    ? "用 Discord App 打开"
    : "在 Discord 网页端打开";
  const canUnpublish = publishStatus !== 0;

  const publishStatusLabel =
    publishStatus === 1
      ? "关联中"
      : publishStatus === 3
        ? "关联失败"
        : ![0, 2].includes(publishStatus)
          ? "关联状态未知"
          : null;

  const openPublishModal = (clearExistingUrl = false) => {
    setShowMore(false);
    setClearPublishUrl(clearExistingUrl);
    setShowPublish(true);
  };

  const confirmUnpublish = () => {
    setShowMore(false);
    if (
      !window.confirm("确认解除讨论帖关联？这会删除发布记录，但不会删除书单。")
    )
      return;
    unpublishMutation.mutate();
  };

  const handleCopyShareText = async () => {
    if (!shareText) return;
    const copied = await copyTextToClipboard(shareText);
    if (copied) {
      toast.success("分享文案已复制");
      return;
    }
    toast.warning("自动复制失败，可以手动选中文案复制");
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
          <div className="min-w-0 flex flex-col gap-4 border-b border-(--od-border) pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary) lg:hidden"
                  aria-label="返回"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-bold tracking-tight text-(--od-text-primary)">
                    {booklist.title}
                  </h1>
                  <p className="mt-1 whitespace-pre-line text-sm text-(--od-text-secondary)">
                    {booklist.description || "暂无简介"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-(--od-text-tertiary)">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {booklist.item_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      {booklist.collection_count}
                    </span>
                    <span>{booklist.is_public ? "公开书单" : "私有书单"}</span>
                    {publishStatus === 2 && discussionUrl && (
                      <a
                        href={discussionUrl}
                        target={discussionLinkTarget}
                        rel={discussionLinkRel}
                        title={discussionLinkTitle}
                        onClick={(e) => {
                          if (usesDiscordAppLink && webDiscussionUrl) {
                            e.preventDefault();
                            openDiscordWithFallback({
                              appUrl: discussionUrl,
                              webUrl: webDiscussionUrl,
                              openMode,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 font-medium text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        讨论帖
                      </a>
                    )}
                    {isOwner && publishStatusLabel && (
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          publishStatus === 3
                            ? "text-(--od-error)"
                            : "text-(--od-accent)"
                        }`}
                      >
                        {publishStatus === 1 && (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {publishStatusLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2 lg:w-auto lg:items-end">
                {isOwner && (
                  <div className="order-1 flex w-full flex-wrap items-center justify-start gap-1 lg:w-auto lg:justify-end">
                    {publishStatus !== 2 ? (
                      <button
                        type="button"
                        onClick={() => openPublishModal()}
                        disabled={
                          publishStatus === 1 || publishMutation.isPending
                        }
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-full px-2 text-xs font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {publishStatus === 1 ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        {publishStatus === 1
                          ? "关联中…"
                          : publishStatus === 3
                            ? "重试关联"
                            : "关联讨论帖"}
                      </button>
                    ) : null}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setShowAdd(true)}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-full px-2 text-xs font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        添加帖子
                      </button>
                    )}

                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowEdit(true)}
                          className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-xs font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          编辑
                        </button>
                        <div ref={moreMenuRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setShowMore((value) => !value)}
                            className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-xs font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary)"
                            aria-haspopup="menu"
                            aria-expanded={showMore}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            更多
                          </button>

                          {showMore && (
                            <div
                              role="menu"
                              className="od-floating-panel-solid absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-(--od-border) p-1.5 shadow-xl"
                            >
                              {publishStatus === 2 && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => openPublishModal(true)}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-(--od-text-primary) transition-colors hover:bg-(--od-bg-secondary)"
                                >
                                  <Link2 className="h-4 w-4" />
                                  更换讨论帖
                                </button>
                              )}
                              <div className="my-1 border-t border-(--od-border)" />
                              {canUnpublish && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={confirmUnpublish}
                                  disabled={unpublishMutation.isPending}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-(--od-error) transition-colors hover:bg-[color-mix(in_srgb,var(--od-error)_10%,transparent)] disabled:opacity-50"
                                >
                                  {unpublishMutation.isPending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Unlink className="h-4 w-4" />
                                  )}
                                  {unpublishMutation.isPending
                                    ? "解除中…"
                                    : "解除关联"}
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setShowMore(false);
                                  if (
                                    !window.confirm(
                                      `确认删除书单「${booklist.title}」？`,
                                    )
                                  )
                                    return;
                                  deleteMutation.mutate(Number(booklistId));
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-(--od-error) transition-colors hover:bg-[color-mix(in_srgb,var(--od-error)_10%,transparent)]"
                              >
                                <Trash2 className="h-4 w-4" />
                                删除书单
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="order-2 flex w-full min-w-0 items-center gap-1 lg:w-auto lg:justify-end">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <LayoutModeToggle
                        value={layoutMode}
                        onChange={setLayoutMode}
                      />

                      <button
                        type="button"
                        onClick={() => detailQuery.refetch()}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${detailQuery.isFetching ? "animate-spin" : ""}`}
                        />
                        刷新
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShareText(buildBooklistShareText(booklist))
                        }
                        className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        分享
                      </button>

                      <button
                        type="button"
                        disabled={collectMutation.isPending}
                        onClick={() =>
                          collectMutation.mutate({
                            id: Number(booklistId),
                            collected: Boolean(booklist.collected_flag),
                          })
                        }
                        className={`inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors hover:text-(--od-accent) disabled:opacity-50 ${
                          booklist.collected_flag
                            ? "text-(--od-accent)"
                            : "text-(--od-text-secondary)"
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${booklist.collected_flag ? "fill-current" : ""}`}
                        />
                        {booklist.collected_flag ? "已收藏" : "收藏"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-(--od-border) bg-(--od-card) p-10 text-center">
              <p className="text-base font-semibold text-(--od-text-primary)">
                书单里还没有帖子
              </p>
              <p className="mt-1 text-sm text-(--od-text-secondary)">
                {isOwner
                  ? "可以点右上角添加帖子，开始充实你的书单吧。"
                  : "作者还在准备中，再等等看。"}
              </p>
            </div>
          ) : (
            <div
              className={
                layoutMode === "list"
                  ? "min-w-0 flex flex-col space-y-od-list-gap"
                  : `${gridClass} min-w-0`
              }
            >
              {items.map((item) => (
                <div
                  key={`${item.booklist_item_id}-${item.thread_id}`}
                  className={
                    layoutMode === "list" ? "min-w-0" : "flex min-w-0 flex-col"
                  }
                >
                  {layoutMode === "list" ? (
                    <ThreadListItem
                      thread={threadFromBooklistItem(item)}
                      onPreview={openPreview}
                      booklistComment={item.comment || ""}
                      animateIn={animateIn}
                    />
                  ) : (
                    <ThreadCard
                      thread={threadFromBooklistItem(item)}
                      onPreview={openPreview}
                      booklistComment={item.comment || ""}
                      animateIn={animateIn}
                    />
                  )}
                  {isOwner && (
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeItemMutation.mutate(String(item.thread_id));
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-(--od-error) transition-colors hover:text-(--od-error)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        移除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 无限滚动探测器 */}
          {itemsQuery.hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-(--od-text-tertiary)" />
            </div>
          )}
        </div>
      </div>

      <BooklistFormModal
        isOpen={showEdit}
        initialValue={booklist}
        submitting={updateMutation.isPending}
        onClose={() => setShowEdit(false)}
        onSubmit={(payload) => updateMutation.mutate({ payload })}
      />

      <AddThreadsToBooklistModal
        isOpen={showAdd}
        submitting={addItemsMutation.isPending}
        onClose={() => setShowAdd(false)}
        onSubmit={(items) => addItemsMutation.mutate(items)}
      />

      <BooklistPublishModal
        isOpen={showPublish}
        initialUrl={clearPublishUrl ? null : publishInfo?.thread_url}
        submitting={publishMutation.isPending}
        onClose={() => setShowPublish(false)}
        onSubmit={(threadUrl) =>
          publishMutation.mutate({ thread_url: threadUrl })
        }
      />

      <BooklistItemEditorModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        submitting={updateItemMutation.isPending}
        onClose={() => setEditingItem(null)}
        onSubmit={(payload) => {
          if (!editingItem) return;
          updateItemMutation.mutate({
            threadId: String(editingItem.thread_id),
            payload,
          });
        }}
      />

      {shareText && (
        <ShareTextDialog
          title="分享这个书单"
          text={shareText}
          onClose={() => setShareText(null)}
          onCopy={handleCopyShareText}
        />
      )}
    </>
  );
}
