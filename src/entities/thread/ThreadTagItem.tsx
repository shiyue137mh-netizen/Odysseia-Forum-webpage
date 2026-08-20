import { Copy, EyeOff, MinusCircle, PlusCircle } from "lucide-react";
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { addToken } from "@/shared/lib/searchTokenizer";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/ContextMenu";

interface ThreadTagItemProps {
  tag: string;
  isVirtual?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: "card" | "list";
}

export function ThreadTagItem({
  tag,
  isVirtual = false,
  onClick,
  className,
  variant = "card",
}: ThreadTagItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, savePreferences, user } = useUserPreferences();

  // 1. 在搜索中包含
  const handleInclude = useCallback(() => {
    if (location.pathname === "/search") {
      const searchParams = new URLSearchParams(location.search);
      const currentQ = searchParams.get("q") || "";
      const nextQ = addToken(currentQ, "tag", tag, "include");
      searchParams.set("q", nextQ);
      navigate(`/search?${searchParams.toString()}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(`tag:${tag}`)}`);
    }
  }, [location.pathname, location.search, navigate, tag]);

  // 2. 在搜索中排除
  const handleExclude = useCallback(() => {
    if (location.pathname === "/search") {
      const searchParams = new URLSearchParams(location.search);
      const currentQ = searchParams.get("q") || "";
      const nextQ = addToken(currentQ, "tag", tag, "exclude");
      searchParams.set("q", nextQ);
      navigate(`/search?${searchParams.toString()}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(`-tag:${tag}`)}`);
    }
  }, [location.pathname, location.search, navigate, tag]);

  // 3. 偏好屏蔽
  const handleBlockPreference = useCallback(async () => {
    if (!user) {
      toast.error("请先登录后再设置偏好屏蔽");
      return;
    }
    const currentExclude = preferences?.exclude_keywords || "";
    const list = currentExclude
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (list.includes(tag)) {
      toast.info(`「${tag}」已在偏好屏蔽列表中`);
      return;
    }

    const nextExclude = [...list, tag].join(", ");
    try {
      await savePreferences({
        preferred_channels: preferences?.preferred_channels,
        include_authors: preferences?.include_authors,
        exclude_authors: preferences?.exclude_authors,
        include_keywords: preferences?.include_keywords,
        exclude_keywords: nextExclude,
      });
      toast.success(`已将「${tag}」加入偏好屏蔽词`);
    } catch {
      toast.error("保存偏好设置失败");
    }
  }, [preferences, savePreferences, tag, user]);

  // 4. 复制标签
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tag);
      toast.success("已复制标签名");
    } catch {
      toast.error("复制失败");
    }
  }, [tag]);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="inline-flex">
        <button
          type="button"
          onClick={onClick}
          className={className}
        >
          {variant === "list" ? `#${tag}` : isVirtual ? `~${tag}` : tag}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuLabel>标签：{tag}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={<PlusCircle className="h-4 w-4" />}
          onClick={handleInclude}
        >
          在搜索中包含
        </ContextMenuItem>
        <ContextMenuItem
          icon={<MinusCircle className="h-4 w-4" />}
          onClick={handleExclude}
        >
          在搜索中排除
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={<EyeOff className="h-4 w-4" />}
          onClick={handleBlockPreference}
        >
          偏好屏蔽此标签
        </ContextMenuItem>
        <ContextMenuItem
          icon={<Copy className="h-4 w-4" />}
          onClick={handleCopy}
        >
          复制标签名
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
