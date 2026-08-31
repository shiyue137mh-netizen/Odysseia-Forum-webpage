import { useEffect } from 'react';
import ServerIcon from '@/assets/images/icon/forum-icon-256.png';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useServerIconSecret } from '@/features/easter-eggs/hooks/useServerIconSecret';
import { MASCOT_IMAGES } from '@/features/mascot/assets';
import { useSearchURLParams } from '@/features/search/hooks/useSearchParams';
import { useChannels } from '@/shared/hooks/useChannels';
import { useAISearchConversationStore } from '@/features/ai-search/lib/session';
import { formatAISearchTimestamp } from '@/features/ai-search/lib/time';
import { withViewTransition } from '@/shared/lib/viewTransition';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { AnimatedIcon } from '@/shared/ui/animation/AnimatedIcon';
import { WordLogoStatic } from '@/shared/ui/loaders/WordLogoStatic';
import {
    BookOpen,
    ChevronUp,
    Compass,
    Dices,
    Info,
    LogOut,
    Search as SearchIcon,
    Settings,
    Tag as TagIcon,
    TestTube,
    Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function formatThreadCount(count: number): string {
  if (count < 10000) return String(count);
  const formatted = (count / 10000).toFixed(1);
  return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}w`;
}

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { params, setParams } = useSearchURLParams();
  const { data: channelsData } = useChannels();
  const handleServerIconClick = useServerIconSecret();
  const [isAISearchHistoryOpen, setIsAISearchHistoryOpen] = useState(false);
  const aiSearchConversations = useAISearchConversationStore((state) => state.conversations);
  const activeAIConversationId = useAISearchConversationStore((state) => state.activeConversationId);
  const unreadAIConversationIds = useAISearchConversationStore((state) => state.unreadConversationIds);
  const selectAIConversation = useAISearchConversationStore((state) => state.selectConversation);

  const groupedChannels = useMemo(() => {
    if (!channelsData?.channels) return [];
    interface Group {
      groupName: string;
      channels: typeof channelsData.channels;
    }
    const map = new Map<string, Group>();
    for (const c of channelsData.channels) {
      const gid = c.groupId || 'other';
      if (!map.has(gid)) {
        map.set(gid, { groupName: c.groupName || '其他区', channels: [] });
      }
      map.get(gid)!.channels.push(c);
    }
    return Array.from(map.values());
  }, [channelsData]);

  const totalAllThreads = useMemo(() => {
    if (!channelsData?.channels) return undefined;
    return channelsData.channels.reduce((sum, c) => sum + (c.totalThreadCount || 0), 0);
  }, [channelsData]);

  const currentURLParams = new URLSearchParams(location.search);
  const isFollowsPage = location.pathname === '/me' && currentURLParams.get('tab') === 'follows';
  const activeChannelId = params.channel;

  const handleLogout = async () => {
    try {
      const { authApi } = await import('@/features/auth/api/authApi');
      await authApi.logout();
    } catch (error) {
      console.error('Backend logout failed:', error);
    }
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname === path;



  const clearChannelSelection = () => {
    if (isFollowsPage) {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('channel');
      navigate(`/me?${nextParams.toString()}`);
      return;
    }

    if (location.pathname !== '/search') {
      navigateToSearchWithParams({ channel: null });
      return;
    }

    setParams({ channel: null });
  };

  useEffect(() => {
    if (location.pathname === '/search' && location.search) {
      try {
        sessionStorage.setItem('od_last_search_params', location.search);
      } catch {
        // ignore
      }
    }
  }, [location.pathname, location.search]);

  const navigateToSearchWithParams = (updates: { channel?: string | null; query?: string }) => {
    let baseSearch = '';
    try {
      baseSearch = sessionStorage.getItem('od_last_search_params') || '';
    } catch {
      baseSearch = '';
    }

    const nextParams = baseSearch ? new URLSearchParams(baseSearch) : new URLSearchParams();
    const nextQuery = updates.query !== undefined ? updates.query : params.query;
    const nextChannel = updates.channel !== undefined ? updates.channel : params.channel;

    if (nextQuery && nextQuery.trim()) nextParams.set('q', nextQuery.trim());
    else if (updates.query !== undefined) nextParams.delete('q');

    if (nextChannel) nextParams.set('channel', nextChannel);
    else if (updates.channel !== undefined) nextParams.delete('channel');

    // 切换频道/重新进入时重置页码为 1
    nextParams.delete('page');

    navigate(`/search${nextParams.toString() ? `?${nextParams.toString()}` : ''}`);
  };

  const navItemClass = (active: boolean) =>
    `group relative flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors duration-200 ${
      active
        ? 'font-medium text-(--od-text-primary)'
        : 'text-(--od-text-secondary) hover:text-(--od-text-primary)'
    }`;

  const navIndicatorClass = (active: boolean) =>
    `h-1.5 w-1.5 rounded-full transition-all duration-300 ${
      active
        ? 'bg-(--od-accent) opacity-100 scale-100'
        : 'bg-(--od-text-tertiary)/45 opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100'
    }`;

  return (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-3 py-4">
        <button
          type="button"
          onClick={handleServerIconClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md focus:outline-hidden focus:ring-2 focus:ring-(--od-accent)"
          aria-label="站点图标"
        >
          <img src={ServerIcon} alt="Server Icon" className="h-full w-full object-cover" />
        </button>
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <span className="truncate text-[12px] font-bold leading-none tracking-widest text-(--od-text-primary)">
            类脑
          </span>
          <WordLogoStatic className="h-[11px] shrink-0 text-(--od-text-primary)" />
        </div>
      </div>

      <div className="od-sidebar-nav scrollbar-invisible flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-6">
          <div className="mb-2 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-(--od-text-tertiary)">
              主导航
            </h2>
          </div>
          <div className="space-y-0.5">
            <Link
              to="/"
              className={navItemClass(isActive('/'))}
            >
              <span className={navIndicatorClass(isActive('/'))} />
              <AnimatedIcon
                icon={Compass}
                className={`h-4 w-4 shrink-0 ${isActive('/') ? 'text-(--od-accent)' : ''}`}
                animation="scale"
                trigger="hover"
              />
              <span className="truncate">广场</span>
            </Link>

            <Link
              to="/tournaments"
              className={navItemClass(isActive('/tournaments') || location.pathname.startsWith('/tournaments/'))}
            >
              <span className={navIndicatorClass(isActive('/tournaments') || location.pathname.startsWith('/tournaments/'))} />
              <AnimatedIcon
                icon={Trophy}
                className={`h-4 w-4 shrink-0 ${
                  isActive('/tournaments') || location.pathname.startsWith('/tournaments/')
                    ? 'text-(--od-accent)'
                    : ''
                }`}
                animation="scale"
                trigger="hover"
              />
              <span className="truncate">赛事</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                let savedSearch = '';
                try {
                  savedSearch = sessionStorage.getItem('od_last_search_params') || '';
                } catch {
                  savedSearch = '';
                }
                navigate(`/search${savedSearch}`);
              }}
              className={navItemClass(isActive('/search'))}
            >
              <span className={navIndicatorClass(isActive('/search'))} />
              <AnimatedIcon
                icon={SearchIcon}
                className={`h-4 w-4 shrink-0 ${isActive('/search') ? 'text-(--od-accent)' : ''}`}
                animation="scale"
                trigger="hover"
              />
              <span className="truncate">搜索</span>
            </button>

            <Link
              to="/draw"
              className={navItemClass(isActive('/draw'))}
            >
              <span className={navIndicatorClass(isActive('/draw'))} />
              <AnimatedIcon
                icon={Dices}
                className={`h-4 w-4 shrink-0 ${isActive('/draw') ? 'text-(--od-accent)' : ''}`}
                animation="pulse"
                trigger="hover"
              />
              <span className="truncate">抽卡</span>
            </Link>

            <Link
              to="/booklists"
              className={navItemClass(isActive('/booklists') || location.pathname.startsWith('/booklists/'))}
            >
              <span className={navIndicatorClass(isActive('/booklists') || location.pathname.startsWith('/booklists/'))} />
              <AnimatedIcon
                icon={BookOpen}
                className={`h-4 w-4 shrink-0 ${
                  isActive('/booklists') || location.pathname.startsWith('/booklists/')
                    ? 'text-(--od-accent)'
                    : ''
                }`}
                animation="scale"
                trigger="hover"
              />
              <span className="truncate">书单</span>
            </Link>

            <Link
              to="/tags"
              className={navItemClass(isActive('/tags'))}
            >
              <span className={navIndicatorClass(isActive('/tags'))} />
              <AnimatedIcon
                icon={TagIcon}
                className={`h-4 w-4 shrink-0 ${isActive('/tags') ? 'text-(--od-accent)' : ''}`}
                animation="rotate"
                trigger="hover"
              />
              <span className="truncate">标签</span>
            </Link>

            <Link
              to="/settings"
              data-tour="sidebar-settings"
              className={navItemClass(isActive('/settings'))}
            >
              <span className={navIndicatorClass(isActive('/settings'))} />
              <AnimatedIcon
                icon={Settings}
                className={`h-4 w-4 shrink-0 ${isActive('/settings') ? 'text-(--od-accent)' : ''}`}
                animation="spin"
                trigger="hover"
              />
              <span className="truncate">设置</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                withViewTransition(() => navigate('/about'), 'wipe-down');
              }}
              className={navItemClass(isActive('/about'))}
            >
              <span className={navIndicatorClass(isActive('/about'))} />
              <AnimatedIcon
                icon={Info}
                className={`h-4 w-4 shrink-0 ${isActive('/about') ? 'text-(--od-accent)' : ''}`}
                animation="bounce"
                trigger="hover"
              />
              <span className="truncate">关于</span>
            </button>

            <ThemeToggle variant="sidebar" />

            {import.meta.env.VITE_API_MOCKING === 'true' && (
              <Link
                to="/test"
                className={navItemClass(isActive('/test'))}
              >
                <span className={navIndicatorClass(isActive('/test'))} />
                <AnimatedIcon
                  icon={TestTube}
                  className={`h-4 w-4 shrink-0 ${isActive('/test') ? 'text-(--od-accent)' : ''}`}
                  animation="pulse"
                  trigger="hover"
                />
                <span className="truncate">开发者模式</span>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-(--od-text-tertiary)">
              频道
            </h2>
          </div>

          <div className="space-y-0.5">
            <button
              onClick={clearChannelSelection}
              title={
                typeof totalAllThreads === 'number' && totalAllThreads > 0
                  ? `全频道（共 ${totalAllThreads.toLocaleString()} 篇帖子）`
                  : '全频道'
              }
              className={navItemClass(!activeChannelId)}
            >
              <span className={navIndicatorClass(!activeChannelId)} />
              <span className="min-w-0 flex-1 truncate text-left">全频道</span>
              {typeof totalAllThreads === 'number' && totalAllThreads > 0 && (
                <span className="pointer-events-none absolute right-1.5 shrink-0 rounded-full border border-white/15 dark:border-white/12 bg-[color-mix(in_srgb,var(--od-bg)_75%,white_25%)] dark:bg-[color-mix(in_srgb,var(--od-bg)_82%,white_18%)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-(--od-text-primary) opacity-0 shadow-xs backdrop-blur-md transition-all duration-200 scale-95 group-hover:opacity-100 group-hover:scale-100">
                  {formatThreadCount(totalAllThreads)}
                </span>
              )}
            </button>

            {groupedChannels.map((category) => (
              <div key={category.groupName} className="mt-4 first:mt-0" role="group" aria-labelledby={`group-${category.groupName}`}>
                <div id={`group-${category.groupName}`} className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-(--od-text-tertiary) opacity-60">
                  {category.groupName}
                </div>
                <div className="space-y-0.5">
                  {category.channels.map((channel) => {
                    const active = activeChannelId === channel.id;
                    return (
                      <button
                        aria-pressed={active}
                        key={channel.id}
                        title={
                          typeof channel.totalThreadCount === 'number'
                            ? channel.virtualThreadCount && channel.virtualThreadCount > 0
                              ? `${channel.name}（共 ${channel.totalThreadCount.toLocaleString()} 篇，含 ${channel.virtualThreadCount.toLocaleString()} 篇子服复原）`
                              : `${channel.name}（共 ${channel.totalThreadCount.toLocaleString()} 篇帖子）`
                            : channel.name
                        }
                        onClick={() => {
                          const nextChannel = active ? null : channel.id;

                          if (isFollowsPage) {
                            const nextParams = new URLSearchParams(location.search);
                            if (nextChannel) {
                              nextParams.set('channel', nextChannel);
                            } else {
                              nextParams.delete('channel');
                            }
                            navigate(`/me?${nextParams.toString()}`);
                            return;
                          }

                          if (location.pathname !== '/search') {
                            navigateToSearchWithParams({ channel: nextChannel });
                            return;
                          }

                          setParams({ channel: nextChannel });
                        }}
                        className={navItemClass(active)}
                      >
                        <span aria-hidden="true" className={navIndicatorClass(active)} />
                        <span className="min-w-0 flex-1 truncate text-left">{channel.name}</span>
                        {typeof channel.totalThreadCount === 'number' && (
                          <span className="pointer-events-none absolute right-1.5 shrink-0 rounded-full border border-white/15 dark:border-white/12 bg-[color-mix(in_srgb,var(--od-bg)_75%,white_25%)] dark:bg-[color-mix(in_srgb,var(--od-bg)_82%,white_18%)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-(--od-text-primary) opacity-0 shadow-xs backdrop-blur-md transition-all duration-200 scale-95 group-hover:opacity-100 group-hover:scale-100">
                            {formatThreadCount(channel.totalThreadCount)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          </div>
        </div>


      </div>

      <div className="border-t border-(--od-border) px-4 py-2">
        <button
          type="button"
          data-tour="sidebar-ai-search"
          onClick={() => {
            setIsAISearchHistoryOpen((current) => !current);
            if (!isActive('/ai-search')) {
              navigate(
                activeAIConversationId
                  ? `/ai-search?conversation=${encodeURIComponent(activeAIConversationId)}`
                  : '/ai-search',
              );
            }
          }}
          aria-expanded={isAISearchHistoryOpen}
          className="group flex w-full items-center gap-2 py-1.5 text-sm text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
        >
          <img
            src={MASCOT_IMAGES.greeting_window}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 shrink-0 object-contain transition-transform duration-200 group-hover:scale-110"
          />
          <span className="min-w-0 flex-1 truncate text-left">问问类脑娘</span>
          {unreadAIConversationIds.length > 0 && (
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-label="有新的类脑娘回复">
              <span className="absolute inset-0 animate-ping rounded-full bg-(--od-accent) opacity-55" />
              <span className="relative m-auto h-1.5 w-1.5 rounded-full bg-(--od-accent)" />
            </span>
          )}
          <ChevronUp
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isAISearchHistoryOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isAISearchHistoryOpen && aiSearchConversations.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5 pb-1 pl-6 pt-1">
                {aiSearchConversations.slice(0, 5).map((conversation) => {
                  const active = conversation.id === activeAIConversationId;
                  return (
                    <Link
                      key={conversation.id}
                      to={`/ai-search?conversation=${encodeURIComponent(conversation.id)}`}
                      onClick={() => selectAIConversation(conversation.id)}
                      className={`group/history block py-1.5 text-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) ${
                        active
                          ? 'font-medium text-(--od-accent)'
                          : 'text-(--od-text-tertiary) hover:text-(--od-accent)'
                      }`}
                      title={conversation.title}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                        {unreadAIConversationIds.includes(conversation.id) && (
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-(--od-accent)" />
                        )}
                      </span>
                      <time className="mt-0.5 block text-[10px] font-normal text-(--od-text-tertiary) transition-colors group-hover/history:text-(--od-text-secondary)">
                        {formatAISearchTimestamp(conversation.updatedAt)}
                      </time>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-2 pt-0">
        <div className="od-fluid-panel rounded-xl p-2 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center gap-1">
            <Link
              to="/me"
              aria-label={`进入 ${user?.global_name || user?.username || 'Guest'} 的个人主页`}
              className="group flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg p-2 transition-colors hover:bg-(--od-bg-secondary) focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
            >
              <div aria-hidden="true" className="relative h-8 w-8 shrink-0">
                <img
                  src={
                    user?.avatar
                      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                      : 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt=""
                  className="h-full w-full rounded-full object-cover ring-2 ring-white/8"
                />
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white/8 bg-green-500" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-bold text-(--od-text-primary)">
                  {user?.global_name || user?.username || 'Guest'}
                </span>
                <span className="truncate text-[10px] text-(--od-text-tertiary)">@{user?.username}</span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-(--od-text-tertiary) transition-colors hover:bg-(--od-bg-secondary) hover:text-(--od-error)"
              title="登出"
            >
              <AnimatedIcon icon={LogOut} className="h-5 w-5" animation="shake" trigger="hover" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
