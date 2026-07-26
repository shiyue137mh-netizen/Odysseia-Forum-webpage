interface ThreadBooklistCommentProps {
  /**
   * undefined 表示不在书单场景，整块不渲染；
   * null / 空串表示在书单场景但无推荐语，渲染占位保持行高对齐。
   */
  comment?: string | null;
  variant: "card" | "list";
}

/** 书单场景下的"推荐语"块。 */
export function ThreadBooklistComment({
  comment,
  variant,
}: ThreadBooklistCommentProps) {
  if (comment === undefined) return null;

  const className =
    variant === "card"
      ? "min-h-12 line-clamp-2 text-xs leading-6 text-(--od-text-secondary)"
      : "text-xs leading-6 text-(--od-text-secondary)";

  return (
    <p className={className}>
      {comment ? (
        <>
          <span className="font-medium text-(--od-accent)">推荐语</span>
          <span className="mx-1 text-(--od-text-tertiary)">/</span>
          {comment}
        </>
      ) : (
        "\u00a0"
      )}
    </p>
  );
}
