/**
 * [`useSearchParams`](webpage/src/features/search/hooks/useSearchParams.ts:1) — 搜索参数的 URL 协议层
 *
 * 所有搜索条件以 URL searchParams 为单一数据来源。
 * 当前协议以 [`q`](webpage/src/features/search/hooks/useSearchParams.ts:11) 为核心，
 * token 搜索语法负责承载 tag / author 等高级条件，
 * 频道筛选独立使用 [`channel`](webpage/src/features/search/hooks/useSearchParams.ts:25) URL 参数，
 * 面板型筛选继续承载排序与时间范围。
 */

import {
  migrateLegacySyntax,
  setSingletonToken,
  tokenizeSearchPayload,
} from "@/shared/lib/searchTokenizer";
import { useCallback, useMemo } from "react";
import { useSearchParams as useRouterSearchParams } from "react-router-dom";

export type SortMethod =
  | "relevance"
  | "last_active_desc"
  | "created_desc"
  | "reply_desc"
  | "reaction_desc";
export type SortOrder = "asc" | "desc";

export type TagLogic = "and" | "or";
export type SearchTargetType = "thread" | "booklist";

export interface SearchParams {
  query: string;
  channel: string | null;
  type: SearchTargetType;
  sortMethod: SortMethod;
  sortOrder: SortOrder;
  page: number;
  includeTags: string[];
  excludeTags: string[];
  includeAuthors: string[];
  excludeAuthors: string[];
  tagLogic: TagLogic;
  timeFrom: string;
  timeTo: string;
  reactionMin: number | null;
  replyMin: number | null;
}

const VALID_SORT_METHODS: Set<string> = new Set([
  "relevance",
  "last_active_desc",
  "created_desc",
  "reply_desc",
  "reaction_desc",
]);
const SEARCH_TAG_LOGIC_KEY = "odysseia_search_tag_logic";

// URL 解析与序列化一律以 "and" 为基准。用户偏好只在发起新搜索时作为初值写进 URL，
// 不参与解析——否则同一条分享链接在不同设备上会解析出不同的标签逻辑，URL 就不再是唯一数据源。
export const DEFAULT_TAG_LOGIC: TagLogic = "and";

export function getSearchTagLogicPreference(): TagLogic {
  if (typeof window === "undefined") return DEFAULT_TAG_LOGIC;
  return window.localStorage.getItem(SEARCH_TAG_LOGIC_KEY) === "or"
    ? "or"
    : DEFAULT_TAG_LOGIC;
}

export function setSearchTagLogicPreference(value: TagLogic) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEARCH_TAG_LOGIC_KEY, value);
}

function normalizeQuery(rawQuery: string) {
  return migrateLegacySyntax(rawQuery || "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripChannelTokens(query: string) {
  return normalizeQuery(query)
    .replace(/(^|\s)-?\$channel:[^$]+\$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTextSearch(query: string) {
  return Boolean(tokenizeSearchPayload(normalizeQuery(query)).text.trim());
}

export function parseParams(sp: URLSearchParams): SearchParams {
  const rawQuery = normalizeQuery(sp.get("q") || "");
  const rawTokenized = tokenizeSearchPayload(rawQuery);
  const strippedQuery = stripChannelTokens(rawQuery);
  const legacyTimeFrom = sp.get("time_from") || "";
  const legacyTimeTo = sp.get("time_to") || "";
  const query = rawTokenized.dateFrom || rawTokenized.dateTo || (!legacyTimeFrom && !legacyTimeTo)
    ? strippedQuery
    : setSingletonToken(strippedQuery, "date", `${legacyTimeFrom}..${legacyTimeTo}`);
  const tokenized = tokenizeSearchPayload(query);

  const rawSort = sp.get("sort");
  const sortMethod: SortMethod = VALID_SORT_METHODS.has(rawSort || "")
    ? (rawSort as SortMethod)
    : (tokenized.text ? "relevance" : "last_active_desc");

  const rawTagLogic = sp.get("tag_logic");
  const tagLogic: TagLogic =
    rawTagLogic === "or" || rawTagLogic === "and" ? rawTagLogic : DEFAULT_TAG_LOGIC;

  const rawType = sp.get("type");
  const type: SearchTargetType = rawType === "booklist" ? "booklist" : "thread";
  const rawPage = Number.parseInt(sp.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const sortOrder: SortOrder = sp.get("order") === "asc" ? "asc" : "desc";

  return {
    query,
    channel: sp.get("channel") || rawTokenized.channels[0] || null,
    type,
    sortMethod,
    sortOrder,
    page,
    includeTags: tokenizeSearchPayload(query).includeTags,
    excludeTags: tokenizeSearchPayload(query).excludeTags,
    includeAuthors: tokenizeSearchPayload(query).includeAuthors,
    excludeAuthors: tokenizeSearchPayload(query).excludeAuthors,
    tagLogic,
    timeFrom: tokenized.dateFrom || "",
    timeTo: tokenized.dateTo || "",
    reactionMin: tokenized.reactionMin,
    replyMin: tokenized.replyMin,
  };
}

export function serializeParams(
  params: Partial<SearchParams>,
): URLSearchParams {
  const sp = new URLSearchParams();

  if (params.query) sp.set("q", normalizeQuery(params.query));
  if (params.channel) sp.set("channel", params.channel);
  if (params.type && params.type !== "thread") sp.set("type", params.type);
  if (params.sortMethod && params.sortMethod !== "last_active_desc") {
    sp.set("sort", params.sortMethod);
  }
  if (params.sortOrder && params.sortOrder !== "desc") sp.set("order", params.sortOrder);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.tagLogic && params.tagLogic !== DEFAULT_TAG_LOGIC) {
    sp.set("tag_logic", params.tagLogic);
  }
  return sp;
}

export function useSearchURLParams() {
  const [searchParams, setSearchParams] = useRouterSearchParams();

  const params = useMemo(() => parseParams(searchParams), [searchParams]);

  const setParams = useCallback(
    (updates: Partial<SearchParams>) => {
      const current = parseParams(searchParams);
      const shouldResetPage =
        updates.page === undefined &&
        ((updates.query !== undefined && updates.query !== current.query) ||
          (updates.channel !== undefined && updates.channel !== current.channel) ||
          (updates.sortMethod !== undefined && updates.sortMethod !== current.sortMethod) ||
          (updates.sortOrder !== undefined && updates.sortOrder !== current.sortOrder) ||
          (updates.tagLogic !== undefined && updates.tagLogic !== current.tagLogic) ||
          (updates.timeFrom !== undefined && updates.timeFrom !== current.timeFrom) ||
          (updates.timeTo !== undefined && updates.timeTo !== current.timeTo) ||
          (updates.reactionMin !== undefined && updates.reactionMin !== current.reactionMin) ||
          (updates.replyMin !== undefined && updates.replyMin !== current.replyMin));
      const nextUpdates = { ...updates };
      if (
        updates.query !== undefined &&
        updates.query !== current.query &&
        updates.sortMethod === undefined
      ) {
        nextUpdates.sortMethod = hasTextSearch(updates.query)
          ? "relevance"
          : "last_active_desc";
      }

      // URL 上没写过 tag_logic 时，用用户偏好作为初值显式写进 URL，
      // 这样链接自带完整语义，换个设备打开结果也一致。
      if (nextUpdates.tagLogic === undefined && !searchParams.has("tag_logic")) {
        nextUpdates.tagLogic = getSearchTagLogicPreference();
      }

      const merged = { ...current, ...nextUpdates, page: shouldResetPage ? 1 : (updates.page ?? current.page) };
      const newSP = serializeParams(merged);
      if (updates.sortMethod === "last_active_desc") {
        newSP.set("sort", "last_active_desc");
      }
      if (updates.tagLogic) {
        setSearchTagLogicPreference(updates.tagLogic);
      }
      const isQueryChange =
        updates.query !== undefined && updates.query !== current.query;
      setSearchParams(newSP, { replace: !isQueryChange });
    },
    [searchParams, setSearchParams],
  );

  const clearParams = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      params.query ||
      params.channel ||
      params.includeTags.length > 0 ||
      params.excludeTags.length > 0 ||
      params.includeAuthors.length > 0 ||
      params.excludeAuthors.length > 0 ||
      params.timeFrom ||
      params.timeTo ||
      params.reactionMin !== null ||
      params.replyMin !== null ||
      (params.sortMethod && params.sortMethod !== "last_active_desc") ||
      (params.sortOrder && params.sortOrder !== "desc") ||
      params.page > 1 ||
      (params.tagLogic && params.tagLogic !== DEFAULT_TAG_LOGIC)
    );
  }, [params]);

  return {
    params,
    setParams,
    clearParams,
    hasActiveFilters,
  } as const;
}
