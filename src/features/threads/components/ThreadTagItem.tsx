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
  useContextMenu,
} from "@/shared/ui/ContextMenu";

interface ThreadTagItemProps {
  tag: string;
  isVirtual?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: "card" | "list";
}

function ThreadTagMenuContent({ tag }: { tag: string }) {
  const { isOpen } = useContextMenu();
  return isOpen ? <ThreadTagMenuActions tag={tag} /> : null;
}

function ThreadTagMenuActions({ tag }: { tag: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, savePreferences, user } = useUserPreferences();

  const handleInclude = useCallback(() => {
    if (location.pathname === "/search") {
      const searchParams = new URLSearchParams(location.search);
      const currentQ = searchParams.get("q") || "";
      searchParams.set("q", addToken(currentQ, "tag", tag, "include"));
      navigate(`/search?${searchParams.toString()}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(`tag:${tag}`)}`);
    }
  }, [location.pathname, location.search, navigate, tag]);

  const handleExclude = useCallback(() => {
    if (location.pathname === "/search") {
      const searchParams = new URLSearchParams(location.search);
      const currentQ = searchParams.get("q") || "";
      searchParams.set("q", addToken(currentQ, "tag", tag, "exclude"));
      navigate(`/search?${searchParams.toString()}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(`-tag:${tag}`)}`);
    }
  }, [location.pathname, location.search, navigate, tag]);

  const handleBlockPreference = useCallback(async () => {
    if (!user) {
      toast.error("请先登录后再设置偏好屏蔽");
      return;
    }
    const list = (preferences?.exclude_keywords || "")
      .split(/[,，]/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (list.includes(tag)) {
      toast.info(`「${tag}」已在偏好屏蔽列表中`);
      return;
    }

    try {
      await savePreferences({
        preferred_channels: preferences?.preferred_channels,
        include_authors: preferences?.include_authors,
        exclude_authors: preferences?.exclude_authors,
        include_keywords: preferences?.include_keywords,
        exclude_keywords: [...list, tag].join(", "),
      });
      toast.success(`已将「${tag}」加入偏好屏蔽词`);
    } catch {
      toast.error("保存偏好设置失败");
    }
  }, [preferences, savePreferences, tag, user]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tag);
      toast.success("已复制标签名");
    } catch {
      toast.error("复制失败");
    }
  }, [tag]);

  return (
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
  );
}

export function ThreadTagItem({
  tag,
  isVirtual = false,
  onClick,
  className,
  variant = "card",
}: ThreadTagItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="inline-flex">
        <button type="button" onClick={onClick} className={className}>
          {variant === "list" ? `#${tag}` : isVirtual ? `~${tag}` : tag}
        </button>
      </ContextMenuTrigger>
      <ThreadTagMenuContent tag={tag} />
    </ContextMenu>
  );
}
