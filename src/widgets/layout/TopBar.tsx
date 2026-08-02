import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import { getDiscoveryPreferenceContext } from "@/features/preferences/lib/discoveryPreferences";
import { SearchFilterPanel } from "@/features/search/components/SearchFilterPanel";
import {
  SearchSuggestions,
  type SearchSuggestionAction,
} from "@/features/search/components/SearchSuggestions";
import { useSearchAutocomplete } from "@/features/search/hooks/useSearchAutocomplete";
import { useAuthorProfiles } from "@/features/authors/hooks/useAuthorProfiles";
import type {
  TagLogic,
} from "@/features/search/hooks/useSearchParams";
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
  Bell,
  Compass,
  Eye,
  Hash,
  Menu,
  Search,
  Settings as SettingsIcon,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface TopBarProps {
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
}

export function TopBar({ onMenuClick, sidebarCollapsed = false }: TopBarProps) {
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
  });

  const { toggleTagToken } =
    useTopBarFilterState({
      params,
      updateQueryFromTokenMutation,
      virtualTagOriginChannelMap,
    });

  const authorProfiles = useAuthorProfiles(authorTokens.map((token) => token.value));
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
      const newValue = `${words.length > 0 ? words.join(" ") : ""}${action.value}`.trim();
      
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

  const getBreadcrumb = () => {
    if (location.pathname === "/settings") {
      return { icon: SettingsIcon, label: "设置" };
    }
    if (location.pathname === "/me") {
      return { icon: User, label: "我的" };
    }
    if (location.pathname === "/search") {
      if (activeVirtualTag) {
        return { icon: Hash, label: activeVirtualTag.name };
      }
      return { icon: Compass, label: "探索" };
    }
    if (location.pathname === "/") {
      return { icon: Compass, label: "广场" };
    }
    return null;
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 flex h-13 shrink-0 items-center justify-between bg-transparent px-3 transition-[left] duration-300 sm:h-17 sm:px-4 ${sidebarCollapsed ? "lg:left-0" : "lg:left-[170px]"
        }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 text-(--od-text-secondary) transition-colors duration-200 hover:text-(--od-text-primary) lg:hidden"
          aria-label="打开菜单"
        >
          <AnimatedIcon
            icon={Menu}
            className="h-5 w-5"
            animation="rotate"
            trigger="click"
          />
        </button>

        {breadcrumb && (
          <div className="hidden items-center gap-2 pl-2 sm:flex">
            <breadcrumb.icon className="hidden h-4 w-4 text-(--od-text-tertiary) md:block" />
            <span className="hidden max-w-[100px] truncate text-sm font-semibold text-(--od-text-primary) md:block md:max-w-none">
              {breadcrumb.label}
            </span>
          </div>
        )}
      </div>

      <div
        className="od-topbar-actions flex flex-1 items-center justify-end gap-2 md:gap-3"
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
                className={`relative mr-2 shrink-0 p-1.5 transition-colors duration-200 ${showFilters || hasPanelFilters
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
                className={`${backgroundImageEnabled ? 'od-floating-glass' : 'od-floating-panel-solid'} fixed top-17 inset-x-3 z-50 mt-2 max-h-[calc(100dvh-5.5rem)] overflow-x-hidden overflow-y-auto rounded-2xl border border-(--od-border-strong) shadow-2xl mx-auto w-auto max-w-md sm:absolute sm:top-full sm:inset-x-auto sm:left-auto sm:right-0 sm:mx-0 sm:w-[560px] sm:max-w-none`}
              >
                {needsFilter && (
                  <div className="flex items-center gap-2 border-b border-white/6 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(true);
                        setShowFilters(false);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${showSuggestions
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${showFilters
                          ? "bg-(--od-accent)/20 text-(--od-accent)"
                          : "text-(--od-text-secondary) hover:bg-(--od-bg-tertiary)"
                        }`}
                    >
                      高级筛选
                    </button>
                  </div>
                )}

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
                    preferenceExcludeTags={discoveryPreferenceContext?.excludeTags || []}
                    preferenceIncludeTags={discoveryPreferenceContext?.includeTags || []}
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
                    channels={[]}
                    authors={suggestionAuthors}
                    threads={suggestionThreads}
                    booklists={suggestionBooklists}
                    suggestedTags={
                      suggestionQuery
                        ? suggestionTags
                        : []
                    }
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => navigate("/me?tab=history")}
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center text-(--od-text-tertiary) transition-colors sm:h-[34px] sm:w-[34px] ${location.pathname === "/me" &&
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

        <div className="relative">
          <button
            aria-label="打开通知中心"
            aria-expanded={notificationOpen}
            onClick={() => setNotificationOpen((prev) => !prev)}
            className={`relative flex h-8 w-8 shrink-0 items-center justify-center text-(--od-text-tertiary) transition-colors sm:h-[34px] sm:w-[34px] ${notificationOpen
                ? "text-(--od-accent)"
                : "hover:text-(--od-text-primary)"
              }`}
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
