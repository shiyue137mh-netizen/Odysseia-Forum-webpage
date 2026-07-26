import { useQueries } from "@tanstack/react-query";

import {
  authorsApi,
  type AuthorProfileResponse,
} from "@/features/authors/api/authorsApi";
import { authorKeys } from "@/features/authors/lib/queryKeys";

export function useAuthorProfiles(authorIds: string[]) {
  const ids = Array.from(new Set(authorIds.filter((id) => /^\d+$/.test(id))));
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: authorKeys.profile(id),
      queryFn: () => authorsApi.getAuthorProfile(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return Object.fromEntries(
    queries.flatMap((query, index) =>
      query.data
        ? [[ids[index], query.data] as [string, AuthorProfileResponse]]
        : [],
    ),
  );
}
