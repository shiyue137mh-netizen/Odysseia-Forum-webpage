import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { getDiscoveryPreferenceContext } from "@/features/preferences/lib/discoveryPreferences";
import type { SearchSuggestionAction } from "@/features/search/components/SearchSuggestions";
import { useSearchAutocomplete } from "@/features/search/hooks/useSearchAutocomplete";
import { useAuthorProfiles } from "@/features/authors/hooks/useAuthorProfiles";
import type { TagLogic } from "@/features/search/hooks/useSearchParams";
import { getSearchTagLogicPreference } from "@/features/search/hooks/useSearchParams";
import { useSearchURLParams } from "@/features/search/hooks/useSearchParams";
import { useTopBarFilterState } from "@/features/search/hooks/useTopBarFilterState";
import { useTopBarSearchController } from "@/features/search/hooks/useTopBarSearchController";
import { usePreviewStore } from "@/features/search/store/previewStore";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import { useThemeSettings } from "@/shared/hooks/useSettings";
import { SearchTokenInput } from "@/shared/ui/SearchTokenInput";
import { AnimatedIcon } from "@/shared/ui/animation/AnimatedIcon";
import {
  ArrowLeft,
  Bell,
  Eye,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  getBrowseHistory,
  clearBrowseHistory,
  type BrowseHistoryItem,
} from "@/shared/lib/browseHistory";
import { AnimatePresence, motion } from "motion/react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface TopBarProps {
  onMenuClick: () => void;
  onSidebarToggle: () => void;
  sidebarCollapsed?: boolean;
}

const SearchFilterPanel = lazy(() =>
  import("@/features/search/components/SearchFilterPanel").then((module) => ({
    default: module.SearchFilterPanel,
  })),
);
const SearchSuggestions = lazy(() =>
  import("@/features/search/components/SearchSuggestions").then((module) => ({
    default: module.SearchSuggestions,
  })),
);
const BrowseHistoryHoverPopup = lazy(() =>
  import("@/features/history/components/BrowseHistoryHoverPopup").then(
    (module) => ({ default: module.BrowseHistoryHoverPopup }),
  ),
);

interface BreadcrumbSegment {
  label: string;
  to?: string;
}

interface BreadcrumbState {
  fallback: string;
  segments: BreadcrumbSegment[];
}

function canHover(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function TopBar({
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed = false,
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === "/search";
  const { params, setParams } = useSearchURLParams();
  const setPreviewThreadId = usePreviewStore(
    (state) => state.setPreviewThreadId,
  );
  const { preferences } = useUserPreferences({ guildId: GUILD_ID });
  const { backgroundImageEnabled } = useThemeSettings();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const notificationTimerRef = useRef<number | null>(null);

  const [browseHistoryOpen, setBrowseHistoryOpen] = useState(false);
  const [browseHistoryItems, setBrowseHistoryItems] = useState<
    BrowseHistoryItem[]
  >([]);
  const browseHistoryTimerRef = useRef<number | null>(null);

  const handleNotificationMouseEnter = useCallback(() => {
    if (!canHover()) return;
    if (notificationTimerRef.current !== null) {
      window.clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = window.setTimeout(() => {
      setNotificationOpen(true);
    }, 150);
  }, []);

  const handleNotificationMouseLeave = useCallback(() => {
    if (notificationTimerRef.current !== null) {
      window.clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = window.setTimeout(() => {
      setNotificationOpen(false);
    }, 220);
  }, []);

  const handleOpenBrowseHistory = useCallback(() => {
    setBrowseHistoryItems(getBrowseHistory());
    setBrowseHistoryOpen(true);
  }, []);

  const handleCloseBrowseHistory = useCallback(() => {
    setBrowseHistoryOpen(false);
  }, []);

  const handleBrowseHistoryMouseEnter = useCallback(() => {
    if (!canHover()) return;
    if (browseHistoryTimerRef.current) {
      window.clearTimeout(browseHistoryTimerRef.current);
    }
    browseHistoryTimerRef.current = window.setTimeout(() => {
      handleOpenBrowseHistory();
    }, 150);
  }, [handleOpenBrowseHistory]);

  const handleBrowseHistoryMouseLeave = useCallback(() => {
    if (browseHistoryTimerRef.current) {
      window.clearTimeout(browseHistoryTimerRef.current);
    }
    browseHistoryTimerRef.current = window.setTimeout(() => {
      handleCloseBrowseHistory();
    }, 200);
  }, [handleCloseBrowseHistory]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current !== null) {
        window.clearTimeout(notificationTimerRef.current);
      }
      if (browseHistoryTimerRef.current) {
        window.clearTimeout(browseHistoryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleNotificationCountMatch = (e: Event) => {
      const customEvent = e as CustomEvent;
      const count = customEvent.detail?.count || 0;
      setHasUnreadNotifications(count > 0);
    };

    window.addEventListener(
      "odysseia:notification-count",
      handleNotificationCountMatch,
    );
    return () => {
      window.removeEventListener(
        "odysseia:notification-count",
        handleNotificationCountMatch,
      );
    };
  }, []);

  const needsFilter = isSearchPage;
  const discoveryPreferenceContext = useMemo(
    () => getDiscoveryPreferenceContext(preferences),
    [preferences],
  );

  const {
    applyInputChange,
    authorTokens,
    clearFilters,
    clearHistory,
    closePanels,
    debouncedQuery,
    executeSearch,
    applyHistoryItem,
    handleInputFocus,
    handleSearch,
    historyItems,
    isPanelOpen,
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
    toggleFilters,
    updateQueryFromTokenMutation,
  } = useTopBarSearchController({
    isSearchPage,
    navigate,
    params,
    setParams,
  });

  const {
    activeVirtualTag,
    availableTags,
    preferredTags,
    channelTagGroups,
    suggestionAuthors,
    suggestionTags,
    suggestionThreads,
    suggestionBooklists,
    suggestionQuery,
    virtualTagOriginChannelMap,
  } = useSearchAutocomplete({
    params,
    preferences,
    searchInput,
    debouncedQuery,
    showSuggestions,
    enabled: isPanelOpen,
  });

  const { toggleTagToken } = useTopBarFilterState({
    params,
    updateQueryFromTokenMutation,
    virtualTagOriginChannelMap,
  });

  const authorProfiles = useAuthorProfiles(
    authorTokens.map((token) => token.value),
  );
  const authorDetails = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(authorProfiles).map(([id, profile]) => [
          id,
          {
            displayName: profile.display_name || profile.name,
            avatarUrl: profile.avatar_url,
          },
        ]),
      ),
    [authorProfiles],
  );

  const handleSuggestionSelect = useCallback(
    (action: SearchSuggestionAction) => {
      if (action.type === "open_thread") {
        setPreviewThreadId(action.threadId);
        closePanels();
        return;
      }

      if (action.type === "replace_query") {
        if (action.submit) {
          executeSearch(action.value);
        } else {
          applyInputChange(action.value);
          closePanels();
        }
        return;
      }

      if (action.type === "open_booklist") {
        navigate(`/booklists/${action.booklistId}`);
        closePanels();
        return;
      }

      if (action.type === "apply_history") {
        applyHistoryItem(action.item);
        return;
      }

      if (action.type === "add_token") {
        if (action.tokenType === "author") {
          selectAuthorToken(action.value, action.mode);
        } else {
          toggleTagToken(action.value, action.mode);
        }
        closePanels();
        return;
      }

      // 移除最后一段正在输入的关键词，替换为建议的 Token
      const words = searchInput.trimEnd().split(/\s+/);
      if (words.length > 0 && words[0] !== "") {
        words.pop();
      } else {
        // 如果输入为空，清空 words 以免 join 时前面多空格
        words.length = 0;
      }
      const newValue =
        `${words.length > 0 ? words.join(" ") : ""}${action.value}`.trim();

      applyInputChange(newValue);
      closePanels();
    },
    [
      applyHistoryItem,
      applyInputChange,
      closePanels,
      executeSearch,
      navigate,
      searchInput,
      selectAuthorToken,
      setPreviewThreadId,
      toggleTagToken,
    ],
  );

  const hasActiveFilters =
    params.includeTags.length > 0 ||
    params.excludeTags.length > 0 ||
    params.includeAuthors.length > 0 ||
    params.excludeAuthors.length > 0 ||
    !!params.timeFrom ||
    !!params.timeTo ||
    params.reactionMin !== null ||
    params.replyMin !== null ||
    (params.tagLogic && params.tagLogic !== getSearchTagLogicPreference());

  const hasPanelFilters = hasActiveFilters;

  const getBreadcrumb = (): BreadcrumbState => {
    if (location.pathname === "/settings") {
      return { fallback: "/", segments: [{ label: "设置" }] };
    }
    if (location.pathname === "/me") {
      return { fallback: "/", segments: [{ label: "我的" }] };
    }
    if (location.pathname === "/search") {
      if (activeVirtualTag) {
        return {
          fallback: "/",
          segments: [
            { label: "探索", to: "/search" },
            { label: activeVirtualTag.name },
          ],
        };
      }
      return { fallback: "/", segments: [{ label: "探索" }] };
    }
    if (location.pathname === "/") {
      return { fallback: "/", segments: [{ label: "广场" }] };
    }
    if (location.pathname === "/ai-search") {
      return { fallback: "/", segments: [{ label: "AI 搜索" }] };
    }
    if (location.pathname === "/draw") {
      return { fallback: "/", segments: [{ label: "抽卡" }] };
    }
    if (location.pathname === "/tags") {
      return { fallback: "/search", segments: [{ label: "标签" }] };
    }
    if (location.pathname === "/booklists") {
      return { fallback: "/", segments: [{ label: "书单" }] };
    }
    if (location.pathname.startsWith("/booklists/")) {
      return {
        fallback: "/booklists",
        segments: [{ label: "书单", to: "/booklists" }, { label: "详情" }],
      };
    }
    if (location.pathname === "/tournaments") {
      return { fallback: "/", segments: [{ label: "赛事" }] };
    }
    if (location.pathname === "/tournaments/mine") {
      return {
        fallback: "/tournaments",
        segments: [
          { label: "赛事", to: "/tournaments" },
          { label: "我的赛事" },
        ],
      };
    }
    if (location.pathname.startsWith("/tournaments/manage/")) {
      return {
        fallback: "/tournaments/mine",
        segments: [
          { label: "我的赛事", to: "/tournaments/mine" },
          { label: "管理" },
        ],
      };
    }
    if (location.pathname.startsWith("/tournaments/")) {
      return {
        fallback: "/tournaments",
        segments: [{ label: "赛事", to: "/tournaments" }, { label: "详情" }],
      };
    }
    if (location.pathname.startsWith("/u/")) {
      return { fallback: "/search", segments: [{ label: "作者主页" }] };
    }
    if (location.pathname.startsWith("/threads/")) {
      return { fallback: "/search", segments: [{ label: "帖子详情" }] };
    }
    return { fallback: "/", segments: [{ label: "页面" }] };
  };

  const breadcrumb = getBreadcrumb();
  const canGoBack = location.pathname !== "/";

  const handleBack = () => {
    const historyIndex = Number(window.history.state?.idx ?? 0);
    if (historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(breadcrumb.fallback);
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 flex h-13 shrink-0 items-center justify-between border-b border-white/6 bg-[color-mix(in_srgb,var(--od-bg-secondary)_88%,transparent)] px-3 backdrop-blur-xl transition-[left] duration-300 sm:h-17 sm:px-4 lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none ${
        sidebarCollapsed ? "lg:left-0" : "lg:left-[170px]"
      }`}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <button
          onClick={onMenuClick}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-text-primary) sm:h-[34px] sm:w-[34px] lg:hidden"
          aria-label="打开菜单"
        >
          <AnimatedIcon
            icon={Menu}
            className="h-4 w-4"
            animation="rotate"
            trigger="click"
          />
        </button>

        <button
          type="button"
          onClick={onSidebarToggle}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-white/6 hover:text-(--od-text-primary) lg:inline-flex"
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        {canGoBack && (
          <button
            type="button"
            onClick={handleBack}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--od-text-tertiary) transition-colors hover:bg-white/6 hover:text-(--od-text-primary) lg:inline-flex"
            aria-label="返回上一页"
            title="返回上一页"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <nav
          aria-label="面包屑"
          className="hidden min-w-0 max-w-44 items-center gap-1 text-sm lg:flex"
        >
          {breadcrumb.segments.map((segment, index) => (
            <div
              key={`${segment.label}-${index}`}
              className="flex min-w-0 items-center gap-1"
            >
              {index > 0 && (
                <span className="text-(--od-text-tertiary)" aria-hidden="true">
                  /
                </span>
              )}
              {segment.to ? (
                <button
                  type="button"
                  onClick={() => navigate(segment.to!)}
                  className="truncate text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary)"
                >
                  {segment.label}
                </button>
              ) : (
                <span className="truncate font-semibold text-(--od-text-primary)">
                  {segment.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div
        className="od-topbar-actions flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-3"
        ref={searchContainerRef}
      >
        <div className="relative min-w-0 flex-1 max-w-[560px]">
          <div className="od-chrome-surface flex min-h-[44px] items-center overflow-hidden rounded-[24px] border border-white/6 transition-colors duration-200 hover:border-white/20">
            <div className="shrink-0 p-2 text-(--od-text-tertiary)">
              <Search className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <SearchTokenInput
                value={searchInput}
                onChange={applyInputChange}
                onSearch={() => {
                  handleSearch();
                  closePanels();
                }}
                onFocus={handleInputFocus}
                externalInputRef={searchInputRef}
                placeholder="不如来试试类脑娘搜索吧"
                className="min-h-[40px] rounded-[24px] bg-transparent"
                authorDetails={authorDetails}
              />
            </div>

            {searchInput.trim() && (
              <button
                type="button"
                onClick={() => {
                  applyInputChange("");
                  executeSearch("");
                }}
                className="relative mr-1 shrink-0 p-1.5 text-(--od-text-tertiary) hover:text-(--od-text-primary) transition-colors duration-200"
                aria-label="清除搜索词"
                title="清除并重置"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {needsFilter && (
              <button
                onClick={toggleFilters}
                data-tour="search-filters-btn"
                className={`relative mr-2 shrink-0 p-1.5 transition-colors duration-200 ${
                  showFilters || hasPanelFilters
                    ? "text-(--od-accent)"
                    : "text-(--od-text-tertiary) hover:text-(--od-text-primary)"
                }`}
                aria-label="筛选"
                title="打开筛选面板"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasPanelFilters && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-(--od-accent)" />
                )}
              </button>
            )}
          </div>

          <AnimatePresence>
            {isPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className={`${backgroundImageEnabled ? "od-floating-glass" : "od-floating-panel-solid"} fixed top-17 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] inset-x-3 z-50 mt-2 overflow-x-hidden overflow-y-auto rounded-2xl border border-(--od-border-strong) shadow-2xl mx-auto w-auto max-w-md sm:absolute sm:top-full sm:bottom-auto sm:inset-x-auto sm:left-auto sm:right-0 sm:mx-0 sm:max-h-[calc(100dvh-5.5rem)] sm:w-[560px] sm:max-w-none`}
              >
                {needsFilter && (
                  <div className="flex items-center gap-2 border-b border-white/6 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(true);
                        setShowFilters(false);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        showSuggestions
                          ? "bg-(--od-accent)/20 text-(--od-accent)"
                          : "text-(--od-text-secondary) hover:bg-(--od-bg-tertiary)"
                      }`}
                    >
                      搜索建议
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFilters(true);
                        setShowSuggestions(false);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        showFilters
                          ? "bg-(--od-accent)/20 text-(--od-accent)"
                          : "text-(--od-text-secondary) hover:bg-(--od-bg-tertiary)"
                      }`}
                    >
                      高级筛选
                    </button>
                  </div>
                )}

                <Suspense fallback={null}>
                  {showFilters ? (
                    <SearchFilterPanel
                      channelTagGroups={channelTagGroups}
                      authorTokens={authorTokens}
                      hasPanelFilters={hasPanelFilters}
                      mergedExcludeTags={params.excludeTags}
                      mergedIncludeTags={params.includeTags}
                      onClearFilters={clearFilters}
                      onRemoveAuthorToken={removeAuthorToken}
                      onSelectAuthorToken={selectAuthorToken}
                      onFilterTokenChange={setFilterToken}
                      onTagLogicChange={(value: TagLogic) =>
                        setParams({ tagLogic: value })
                      }
                      onToggleTagToken={toggleTagToken}
                      preferenceExcludeTags={
                        discoveryPreferenceContext?.excludeTags || []
                      }
                      preferenceIncludeTags={
                        discoveryPreferenceContext?.includeTags || []
                      }
                      tagLogic={params.tagLogic}
                      timeFrom={params.timeFrom}
                      timeTo={params.timeTo}
                      reactionMin={params.reactionMin}
                      replyMin={params.replyMin}
                    />
                  ) : (
                    <SearchSuggestions
                      currentQuery={searchInput}
                      availableTags={availableTags}
                      preferredTags={preferredTags}
                      channels={[]}
                      authors={suggestionAuthors}
                      threads={suggestionThreads}
                      booklists={suggestionBooklists}
                      suggestedTags={suggestionQuery ? suggestionTags : []}
                      history={historyItems}
                      onSelect={handleSuggestionSelect}
                      onRemoveHistory={(item) => {
                        removeHistoryItem(item);
                      }}
                      onClearHistory={() => {
                        clearHistory();
                      }}
                      onClose={closePanels}
                      inputRef={searchInputRef}
                      embedded
                      preferenceAware={!!preferences}
                    />
                  )}
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="relative"
          onMouseEnter={handleBrowseHistoryMouseEnter}
          onMouseLeave={handleBrowseHistoryMouseLeave}
        >
          <button
            type="button"
            onClick={() => {
              if (browseHistoryTimerRef.current !== null) {
                window.clearTimeout(browseHistoryTimerRef.current);
              }
              handleCloseBrowseHistory();
              navigate("/me?tab=history");
            }}
            className={`relative flex h-8 w-8 shrink-0 items-center justify-center text-(--od-text-tertiary) transition-colors sm:h-[34px] sm:w-[34px] ${
              location.pathname === "/me" &&
              new URLSearchParams(location.search).get("tab") === "history"
                ? "text-(--od-accent)"
                : "hover:text-(--od-text-primary)"
            }`}
            aria-label="打开浏览足迹"
            title="浏览足迹"
          >
            <AnimatedIcon
              icon={Eye}
              className="h-4 w-4"
              animation="scale"
              trigger="hover"
            />
          </button>
          {browseHistoryOpen && (
            <Suspense fallback={null}>
              <BrowseHistoryHoverPopup
                open
                historyItems={browseHistoryItems}
                onSelectThread={(threadId) => {
                  setPreviewThreadId(threadId);
                  handleCloseBrowseHistory();
                }}
                onClearHistory={() => {
                  clearBrowseHistory();
                  setBrowseHistoryItems([]);
                }}
                onClose={handleCloseBrowseHistory}
              />
            </Suspense>
          )}
        </div>

        <div
          className="relative"
          onMouseEnter={handleNotificationMouseEnter}
          onMouseLeave={handleNotificationMouseLeave}
        >
          <button
            aria-label="打开通知与动态"
            aria-expanded={notificationOpen}
            onClick={() => {
              if (notificationTimerRef.current !== null) {
                window.clearTimeout(notificationTimerRef.current);
              }
              setNotificationOpen(false);
              navigate("/activity");
            }}
            className={`relative flex h-8 w-8 shrink-0 items-center justify-center text-(--od-text-tertiary) transition-colors sm:h-[34px] sm:w-[34px] ${
              notificationOpen || location.pathname === "/activity"
                ? "text-(--od-accent)"
                : "hover:text-(--od-text-primary)"
            }`}
            title="通知与动态"
          >
            <AnimatedIcon
              icon={Bell}
              className="h-4 w-4"
              animation="shake"
              trigger="hover"
            />
            {hasUnreadNotifications && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full border border-(--od-bg) bg-red-500" />
            )}
          </button>
          <NotificationCenter
            open={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            onUnreadChange={(count) => {
              setHasUnreadNotifications(count > 0);
              window.dispatchEvent(
                new CustomEvent("odysseia:notification-count", {
                  detail: { count },
                }),
              );
            }}
          />
        </div>
      </div>
    </header>
  );
}
