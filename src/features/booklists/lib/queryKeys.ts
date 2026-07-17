export type BooklistScope = "public" | "mine" | "collected";

export const booklistKeys = {
  all: ["booklists"] as const,
  lists: () => [...booklistKeys.all, "list"] as const,
  list: (params: {
    scope: BooklistScope;
    keywords?: string;
    sortMethod: number;
    pageIndex: number;
    pageSize: number;
    isTournament?: boolean;
    ownerId?: string;
  }) => [...booklistKeys.lists(), params] as const,
  mineLists: () => [...booklistKeys.all, "mine"] as const,
  detail: (booklistId: number | string) =>
    [...booklistKeys.all, "detail", String(booklistId)] as const,
  items: (booklistId: number | string) =>
    [...booklistKeys.all, "items", String(booklistId)] as const,
};
