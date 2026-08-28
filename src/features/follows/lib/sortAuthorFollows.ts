import type { AuthorFollowItem } from "@/features/follows/api/authorFollowsApi";

export type AuthorFollowSort =
  | "followed-newest"
  | "followed-oldest"
  | "name-asc"
  | "name-desc";

const authorNameCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

export function getAuthorFollowName(item: AuthorFollowItem): string {
  return (
    item.author.display_name ||
    item.author.global_name ||
    item.author.name ||
    item.author.id
  );
}

function timestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortAuthorFollows(
  items: AuthorFollowItem[],
  sort: AuthorFollowSort,
): AuthorFollowItem[] {
  return [...items].sort((left, right) => {
    let difference = 0;

    if (sort === "followed-newest") {
      difference = timestamp(right.followed_at) - timestamp(left.followed_at);
    } else if (sort === "followed-oldest") {
      difference = timestamp(left.followed_at) - timestamp(right.followed_at);
    } else {
      difference = authorNameCollator.compare(
        getAuthorFollowName(left),
        getAuthorFollowName(right),
      );
      if (sort === "name-desc") difference *= -1;
    }

    return difference || String(left.author.id).localeCompare(String(right.author.id));
  });
}
