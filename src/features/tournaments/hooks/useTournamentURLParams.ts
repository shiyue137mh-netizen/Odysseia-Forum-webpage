import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface TournamentParams {
  sort: number;
  page: number;
  query: string;
}

export function useTournamentURLParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo((): TournamentParams => {
    const sort = Number.parseInt(searchParams.get("sort") || "4", 10);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);

    return {
      sort: Number.isNaN(sort) ? 4 : sort,
      page: Number.isNaN(page) ? 1 : page,
      query: (searchParams.get("q") || "").trim(),
    };
  }, [searchParams]);

  const setParams = useCallback(
    (updates: Partial<TournamentParams>) => {
      const current = {
        sort: searchParams.get("sort") || "4",
        page: searchParams.get("page") || "1",
        query: searchParams.get("q") || "",
      };
      const next = { ...current };

      if (updates.sort !== undefined) next.sort = String(updates.sort);
      if (updates.page !== undefined) next.page = String(updates.page);
      if (updates.query !== undefined) next.query = updates.query.trim();

      const sortChanged = updates.sort !== undefined && String(updates.sort) !== current.sort;
      const queryChanged = updates.query !== undefined && updates.query.trim() !== current.query.trim();
      if (sortChanged || queryChanged) {
        next.page = "1";
      }

      const newSearchParams = new URLSearchParams();
      if (next.sort !== "4") newSearchParams.set("sort", next.sort);
      if (next.page !== "1") newSearchParams.set("page", next.page);
      if (next.query) newSearchParams.set("q", next.query);

      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return {
    params,
    setParams,
  } as const;
}
