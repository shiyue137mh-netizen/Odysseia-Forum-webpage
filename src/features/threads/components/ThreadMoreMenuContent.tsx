import {
  Bell,
  BellOff,
  BookOpen,
  Copy,
  Edit3,
  ExternalLink,
  ImagePlus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import type { Thread } from "@/entities/thread/types";
import { hasViewerFlag } from "@/entities/thread/lib/viewerFlags";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToggleThreadFollow } from "@/features/follows/hooks/useFollowsData";
import { followsKeys } from "@/features/follows/lib/queryKeys";
import type { ThreadItemManagementActions } from "@/features/threads/components/threadItemActions";
import { copyTextToClipboard } from "@/shared/lib/shareText";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/shared/ui/ContextMenu";

interface ThreadMoreMenuContentProps {
  thread: Thread;
  onAddToBooklist: () => void;
  onFindSimilar?: () => void;
  onAISimilar?: () => void;
  onApplyBanner?: () => void;
  managementActions?: ThreadItemManagementActions;
}

export function ThreadMoreMenuContent({
  thread,
  onAddToBooklist,
  onFindSimilar,
  onAISimilar,
  onApplyBanner,
  managementActions,
}: ThreadMoreMenuContentProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const toggleFollow = useToggleThreadFollow();
  const initialFollowed = hasViewerFlag(thread, "followed");
  const followed =
    queryClient.getQueryData<boolean>(followsKeys.state(thread.thread_id)) ??
    initialFollowed;

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/threads/${thread.thread_id}`;
    if (await copyTextToClipboard(url)) {
      toast.success("已复制作品链接");
    } else {
      toast.error("复制作品链接失败");
    }
  };

  const handleOpenInNewTab = () => {
    window.open(
      `/threads/${thread.thread_id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <>
      <ContextMenuItem
        icon={<BookOpen className="h-4 w-4" />}
        onClick={onAddToBooklist}
      >
        加入书单
      </ContextMenuItem>
      <ContextMenuItem
        icon={
          followed ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )
        }
        disabled={!isAuthenticated || toggleFollow.isPending}
        onClick={() =>
          toggleFollow.mutate({ threadId: thread.thread_id, followed })
        }
      >
        {!isAuthenticated
          ? "登录后关注作品"
          : toggleFollow.isPending
            ? "更新关注中…"
            : followed
              ? "取消关注作品"
              : "关注作品"}
      </ContextMenuItem>
      {onApplyBanner && (
        <ContextMenuItem
          icon={<ImagePlus className="h-4 w-4" />}
          onClick={onApplyBanner}
        >
          申请 Banner
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        icon={<Copy className="h-4 w-4" />}
        onClick={() => void handleCopyLink()}
      >
        复制作品链接
      </ContextMenuItem>
      <ContextMenuItem
        icon={<ExternalLink className="h-4 w-4" />}
        onClick={handleOpenInNewTab}
      >
        在新标签页打开
      </ContextMenuItem>
      {(onFindSimilar || onAISimilar) && (
        <>
          <ContextMenuSeparator />
          {onFindSimilar && (
            <ContextMenuItem
              icon={<Search className="h-4 w-4" />}
              onClick={onFindSimilar}
            >
              找相似作品
            </ContextMenuItem>
          )}
          {onAISimilar && (
            <ContextMenuItem
              icon={<Sparkles className="h-4 w-4" />}
              onClick={onAISimilar}
            >
              AI 探索相似
            </ContextMenuItem>
          )}
        </>
      )}
      {managementActions && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            icon={<Edit3 className="h-4 w-4" />}
            onClick={managementActions.onEdit}
          >
            编辑书单备注
          </ContextMenuItem>
          <ContextMenuItem
            variant="danger"
            disabled={managementActions.removePending}
            icon={<Trash2 className="h-4 w-4" />}
            onClick={managementActions.onRemove}
          >
            {managementActions.removePending ? "移除中…" : "从书单移除"}
          </ContextMenuItem>
        </>
      )}
    </>
  );
}
