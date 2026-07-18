import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistory,
  type SearchHistoryItem,
} from "@/shared/lib/searchHistory";
import {
  parseSearchQuery,
  removeToken,
  setSingletonToken,
  setTokenMode,
  type SearchToken,
} from "@/shared/lib/searchTokenizer";
import {
  getSearchTagLogicPreference,
  type SearchParams,
} from "@/features/search/hooks/useSearchParams";

const SEARCH_DRAFT_QUERY_KEY = "odysseia_search_draft_query";
const SEARCH_DRAFT_CHANNEL_KEY = "odysseia_search_draft_channel";

function getPersistedDraftQuery() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(SEARCH_DRAFT_QUERY_KEY) || "";
}

function getPersistedDraftChannel() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(SEARCH_DRAFT_CHANNEL_KEY) || "";
}

function setPersistedDraftQuery(value: string) {
  if (typeof window === "undefined") return;
  if (!value.trim()) {
    window.sessionStorage.removeItem(SEARCH_DRAFT_QUERY_KEY);
    return;
  }
  window.sessionStorage.setItem(SEARCH_DRAFT_QUERY_KEY, value.trim());
}

function setPersistedDraftChannel(value: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.sessionStorage.removeItem(SEARCH_DRAFT_CHANNEL_KEY);
    return;
  }
  window.sessionStorage.setItem(SEARCH_DRAFT_CHANNEL_KEY, value);
}

function tokenSignature(query: string) {
  return parseSearchQuery(query || "")
    .filter((token) => token.type !== "text")
    .map(
      (token) =>
        `${token.mode || "include"}:${token.type}:${token.value.trim()}`,
    )
    .filter(Boolean)
    .sort()
    .join("|");
}

interface UseTopBarSearchControllerOptions {
  isSearchPage: boolean;
  navigate: NavigateFunction;
  params: SearchParams;
  setParams: (updates: Partial<SearchParams>) => void;
}

export function useTopBarSearchController({
  isSearchPage,
  navigate,
  params,
  setParams,
}: UseTopBarSearchControllerOptions) {
  const initialQuery = params.query || getPersistedDraftQuery();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery.trim());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [historyItems, setHistoryItems] = useState(() => getSearchHistory());

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const closePanels = useCallback(() => {
    setShowSuggestions(false);
    setShowFilters(false);
  }, []);

  useEffect(() => {
    const persisted = getPersistedDraftQuery();
    
    if (params.query) {
      setSearchInput(params.query);
      setPersistedDraftQuery(params.query);
    } else if (persisted) {
      setSearchInput(persisted);
      if (isSearchPage) {
        setParams({ query: persisted });
      }
    } else {
      setSearchInput("");
    }
  }, [params.query, isSearchPage, setParams]);

  useEffect(() => {
    setPersistedDraftChannel(params.channel);
  }, [params.channel]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (showSuggestions) {
      setHistoryItems(getSearchHistory());
    }
  }, [showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        closePanels();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closePanels]);

  const executeSearch = useCallback(
    (nextQuery: string) => {
      const trimmed = nextQuery.trim();
      setSearchInput(trimmed);
      setPersistedDraftQuery(trimmed);

      if (!isSearchPage) {
        const nextParams = new URLSearchParams();
        const draftChannel = getPersistedDraftChannel();
        if (trimmed) nextParams.set("q", trimmed);
        if (params.channel) {
          nextParams.set("channel", params.channel);
        } else if (draftChannel) {
          nextParams.set("channel", draftChannel);
        }
        navigate(
          `/search${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
        );
      } else {
        setParams({ query: trimmed, page: 1 });
      }

      if (trimmed) {
        addSearchHistory({
          query: trimmed,
          channel: params.channel,
          sortMethod: params.sortMethod,
          tagLogic: params.tagLogic,
          includeTags: params.includeTags,
          excludeTags: params.excludeTags,
        });
        setHistoryItems(getSearchHistory());
      }
      closePanels();
    },
    [
      closePanels,
      isSearchPage,
      navigate,
      params.channel,
      params.excludeTags,
      params.includeTags,
      params.sortMethod,
      params.tagLogic,
      setParams,
    ],
  );

  const applyInputChange = useCallback(
    (nextQuery: string) => {
      setSearchInput(nextQuery);
      setPersistedDraftQuery(nextQuery);

      const tokenChanged =
        tokenSignature(nextQuery) !== tokenSignature(params.query || "");
      if (!tokenChanged) return;

      const trimmed = nextQuery.trim();
      if (!isSearchPage) {
        const nextParams = new URLSearchParams();
        const draftChannel = getPersistedDraftChannel();
        if (trimmed) nextParams.set("q", trimmed);
        if (params.channel) {
          nextParams.set("channel", params.channel);
        } else if (draftChannel) {
          nextParams.set("channel", draftChannel);
        }
        navigate(
          `/search${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
        );
      } else {
        setParams({ query: trimmed, page: 1 });
      }
    },
    [isSearchPage, navigate, params.query, setParams],
  );

  const handleSearch = useCallback(() => {
    executeSearch(searchInput);
  }, [executeSearch, searchInput]);

  const applyHistoryItem = useCallback(
    (item: SearchHistoryItem) => {
      setSearchInput(item.query);
      setPersistedDraftQuery(item.query);

      if (!isSearchPage) {
        const nextParams = new URLSearchParams();
        if (item.query.trim()) nextParams.set("q", item.query.trim());
        if (item.channel) {
          nextParams.set("channel", item.channel);
        } else {
          const draftChannel = getPersistedDraftChannel();
          if (draftChannel) nextParams.set("channel", draftChannel);
        }
        if (item.sortMethod && item.sortMethod !== "last_active_desc")
          nextParams.set("sort", item.sortMethod);
        if (
          item.tagLogic &&
          (item.tagLogic === "or" ||
            item.tagLogic !== getSearchTagLogicPreference())
        )
          nextParams.set("tag_logic", item.tagLogic);
        navigate(
          `/search${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
        );
      } else {
        setParams({
          query: item.query,
          channel: item.channel || null,
          sortMethod:
            (item.sortMethod as SearchParams["sortMethod"]) ||
            "last_active_desc",
          tagLogic: item.tagLogic || "and",
          sortOrder: "desc",
          page: 1,
        });
      }

      addSearchHistory(item);
      setHistoryItems(getSearchHistory());
      closePanels();
    },
    [closePanels, isSearchPage, navigate, setParams],
  );

  const toggleFilters = useCallback(() => {
    if (showFilters) {
      closePanels();
      return;
    }
    setShowSuggestions(false);
    setShowFilters(true);
  }, [closePanels, showFilters]);

  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);
    setShowFilters(false);
  }, []);

  const allQueryTokens = useMemo(
    () => parseSearchQuery(searchInput),
    [searchInput],
  );
  const authorTokens = useMemo(
    () => allQueryTokens.filter((token) => token.type === "author"),
    [allQueryTokens],
  );

  const updateQuery = useCallback(
    (nextQuery: string) => {
      setSearchInput(nextQuery);
      setPersistedDraftQuery(nextQuery);
      setParams({ query: nextQuery, page: 1 });
    },
    [setParams],
  );

  const updateQueryFromTokenMutation = useCallback(
    (mutator: (tokens: SearchToken[]) => string) => {
      updateQuery(mutator(parseSearchQuery(params.query || "")));
    },
    [params.query, updateQuery],
  );

  const removeAuthorToken = useCallback(
    (token: SearchToken) => {
      updateQuery(removeToken(params.query || "", token).trim());
    },
    [params.query, updateQuery],
  );

  const selectAuthorToken = useCallback(
    (authorId: string, mode: "include" | "exclude") => {
      updateQuery(setTokenMode(params.query || "", "author", authorId, mode).trim());
    },
    [params.query, updateQuery],
  );

  const setFilterToken = useCallback(
    (type: "date" | "likes" | "replies", value: string | null) => {
      updateQuery(setSingletonToken(params.query || "", type, value).trim());
    },
    [params.query, updateQuery],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setPersistedDraftQuery("");
    setParams({
      query: "",
      sortMethod: "last_active_desc",
      sortOrder: "desc",
      page: 1,
      tagLogic: getSearchTagLogicPreference(),
    });
  }, [setParams]);

  const removeHistoryItem = useCallback((item: SearchHistoryItem | string) => {
    removeSearchHistory(item);
    setHistoryItems(getSearchHistory());
  }, []);

  const clearHistory = useCallback(() => {
    clearSearchHistory();
    setHistoryItems([]);
  }, []);

  return {
    applyInputChange,
    authorTokens,
    clearFilters,
    clearHistory,
    closePanels,
    debouncedQuery,
    executeSearch,
    handleInputFocus,
    handleSearch,
    applyHistoryItem,
    historyItems,
    isPanelOpen: showSuggestions || showFilters,
    removeAuthorToken,
    removeHistoryItem,
    searchContainerRef,
    searchInput,
    searchInputRef,
    selectAuthorToken,
    setFilterToken,
    setShowFilters,
    setShowSuggestions,
    showFilters,
    showSuggestions,
    updateQuery,
    updateQueryFromTokenMutation,
    toggleFilters,
  };
}
