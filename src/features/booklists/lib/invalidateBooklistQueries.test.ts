import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { invalidateBooklistQueries } from "@/features/booklists/lib/invalidateBooklistQueries";
import { booklistKeys } from "@/features/booklists/lib/queryKeys";

describe("invalidateBooklistQueries", () => {
  it("只失效列表和实际受影响书单的详情与条目缓存", async () => {
    const queryClient = new QueryClient();
    const keys = [
      booklistKeys.lists(),
      booklistKeys.mineLists(),
      booklistKeys.detail(1),
      booklistKeys.items(1),
      booklistKeys.coverItems(1),
      booklistKeys.detail(2),
      booklistKeys.items(2),
    ] as const;

    keys.forEach((queryKey) => queryClient.setQueryData(queryKey, {}));

    await invalidateBooklistQueries(queryClient, {
      booklistIds: [1],
      includeItems: true,
    });

    expect(queryClient.getQueryState(booklistKeys.lists())?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(booklistKeys.mineLists())?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(booklistKeys.detail(1))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(booklistKeys.items(1))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(booklistKeys.coverItems(1))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(booklistKeys.detail(2))?.isInvalidated,
    ).toBe(false);
    expect(
      queryClient.getQueryState(booklistKeys.items(2))?.isInvalidated,
    ).toBe(false);
  });
});
