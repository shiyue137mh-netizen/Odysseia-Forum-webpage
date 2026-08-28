import { useNavigate } from "react-router-dom";

import type { Author, Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { AuthorWorksHoverCard } from "@/features/authors/components/AuthorWorksHoverCard";

interface AuthorIdentityLinkProps {
  author?: Author | null;
  currentThreadId?: string;
  viewerFlags?: Thread["viewer_flags"];
  showName?: boolean;
  showAvatar?: boolean;
  onNavigate?: (author: { id: string; name: string }) => void;
  fallbackName?: string;
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
}

function getAuthorName(author?: Author | null) {
  return (
    author?.display_name || author?.global_name || author?.name || "未知作者"
  );
}

export function AuthorIdentityLink({
  author,
  currentThreadId,
  viewerFlags,
  showName = true,
  showAvatar = true,
  onNavigate,
  fallbackName,
  className = "",
  avatarClassName = "h-5 w-5",
  nameClassName = "",
}: AuthorIdentityLinkProps) {
  const navigate = useNavigate();
  const authorName = author?.id
    ? getAuthorName(author)
    : fallbackName || getAuthorName(author);
  const content = (
    <>
      {showAvatar && (
        <AuthorAvatar
          author={author}
          className={`${avatarClassName} ring-1 ring-(--od-border-strong)/30 transition-[box-shadow] duration-200 group-hover/author:ring-(--od-accent) group-focus-visible/author:ring-(--od-accent)`}
        />
      )}
      {showName && (
        <span
          className={`min-w-0 truncate transition-colors duration-200 group-hover/author:text-(--od-accent) group-focus-visible/author:text-(--od-accent) ${nameClassName}`}
        >
          {authorName}
        </span>
      )}
    </>
  );

  if (!author?.id) {
    return (
      <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
        {content}
      </span>
    );
  }

  return (
    <AuthorWorksHoverCard
      author={author}
      currentThreadId={currentThreadId}
      initialFollowed={
        viewerFlags === undefined
          ? undefined
          : viewerFlags.includes("followed_author")
      }
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (onNavigate) {
            onNavigate({ id: String(author.id), name: authorName });
            return;
          }
          navigate(`/u/${author.id}`);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        className={`group/author inline-flex min-w-0 items-center gap-1.5 text-(--od-text-tertiary) focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) ${className}`}
        aria-label={`查看作者：${authorName}`}
      >
        {content}
      </button>
    </AuthorWorksHoverCard>
  );
}
