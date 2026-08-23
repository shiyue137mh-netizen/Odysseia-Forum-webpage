import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { booklistKeys } from "@/features/booklists/lib/queryKeys";

export function invalidateBooklistQueries(
  queryClient: QueryClient,
  options: {
    booklistIds?: Array<number | string>;
    includeItems?: boolean;
  } = {},
) {
  const booklistIds = [...new Set(options.booklistIds?.map(String) ?? [])];
  const queryKeys: QueryKey[] = [
    booklistKeys.lists(),
    booklistKeys.mineLists(),
  ];

  for (const booklistId of booklistIds) {
    queryKeys.push(booklistKeys.detail(booklistId));
    if (options.includeItems) {
      queryKeys.push(booklistKeys.items(booklistId));
      queryKeys.push(booklistKeys.coverItems(booklistId));
    }
  }

  return Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
