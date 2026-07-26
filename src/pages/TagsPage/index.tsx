import { useMemo, useState, type MouseEvent } from "react";
import { Search, Tag as TagIcon, TrendingUp, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { addToken } from "@/shared/lib/searchTokenizer";
import { useSidebarCollapsedSetting } from "@/shared/hooks/useSettings";
import { FluidDivider } from "@/shared/ui/FluidDivider";
import { Select } from "@/shared/ui/Select";
import { useTagStats } from "@/features/tags/hooks/useTagStats";
import { useChannels } from "@/shared/hooks/useChannels";

interface AggregatedChannelSlice {
  channelId: string;
  channelName: string;
  isVirtual: boolean;
  count: number;
}

interface AggregatedTagCard {
  key: string;
  name: string;
  totalCount: number;
  channelSlices: AggregatedChannelSlice[];
  topChannelSlices: AggregatedChannelSlice[];
  remainingChannels: number;
  hasVirtual: boolean;
  normalizedChannelSearch: string;
}

const ALL_CHANNELS_VALUE = "__all__";
const TOP_CHANNEL_SLICE_COUNT = 3;

export function TagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] =
    useState<string>(ALL_CHANNELS_VALUE);
  const navigate = useNavigate();
  const sidebarCollapsed = useSidebarCollapsedSetting();

  const { data: channelsData, isLoading: isChannelsLoading } = useChannels();
  const channelMap = useMemo(() => {
    const map = new Map<string, string>();
    channelsData?.apiData?.forEach((c) => map.set(c.channel_id, c.name));
    return map;
  }, [channelsData]);

  const channelOptions = useMemo(() => {
    if (!channelsData?.channels) return [];
    return channelsData.channels
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [channelsData]);

  const selectedChannelName = useMemo(() => {
    if (selectedChannelId === ALL_CHANNELS_VALUE) return "All Channels";
    return (
      channelOptions.find((channel) => channel.id === selectedChannelId)
        ?.name || `频道 ${selectedChannelId}`
    );
  }, [channelOptions, selectedChannelId]);

  const { data: statsData, isLoading: isStatsLoading } = useTagStats(
    selectedChannelId === ALL_CHANNELS_VALUE ? null : [selectedChannelId],
  );

  const aggregatedTags = useMemo<AggregatedTagCard[]>(() => {
    if (!statsData) return [];

    const grouped = new Map<string, AggregatedTagCard>();

    statsData.items.forEach((item) => {
      const base = grouped.get(item.tag_name) || {
        key: item.tag_name,
        name: item.tag_name,
        totalCount: 0,
        channelSlices: [] as AggregatedChannelSlice[],
        topChannelSlices: [],
        remainingChannels: 0,
        hasVirtual: false,
        normalizedChannelSearch: "",
      };

      item.channel_info.forEach((info) => {
        const channelName =
          info.channel_name ||
          channelMap.get(info.channel_id) ||
          `频道 ${info.channel_id}`;
        const existingSlice = base.channelSlices.find(
          (slice) =>
            slice.channelId === info.channel_id &&
            slice.isVirtual === info.is_virtual,
        );

        if (existingSlice) {
          existingSlice.count += info.thread_count;
        } else {
          base.channelSlices.push({
            channelId: info.channel_id,
            channelName,
            isVirtual: info.is_virtual,
            count: info.thread_count,
          });
        }
      });

      // 统计值以后端 total_thread_count 为准，channel_info 仅用于分解展示
      base.totalCount = Number(item.total_thread_count || 0);
      base.hasVirtual = base.channelSlices.some((slice) => slice.isVirtual);
      grouped.set(item.tag_name, base);
    });

    return Array.from(grouped.values())
      .map((tag) => {
        const sortedSlices = [...tag.channelSlices].sort(
          (a, b) => b.count - a.count,
        );
        const topChannelSlices = sortedSlices.slice(0, TOP_CHANNEL_SLICE_COUNT);
        const remainingChannels = Math.max(
          sortedSlices.length - topChannelSlices.length,
          0,
        );
        const normalizedChannelSearch = sortedSlices
          .map((slice) => slice.channelName.toLowerCase())
          .join(" ");

        return {
          ...tag,
          topChannelSlices,
          remainingChannels,
          normalizedChannelSearch,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [channelMap, statsData]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return aggregatedTags;

    const query = searchQuery.toLowerCase();
    return aggregatedTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        tag.normalizedChannelSearch.includes(query),
    );
  }, [aggregatedTags, searchQuery]);

  const handleTagClick = (tag: AggregatedTagCard) => {
    let query = addToken("", "tag", tag.name);
    if (selectedChannelId !== ALL_CHANNELS_VALUE) {
      query = addToken(query, "channel", selectedChannelId);
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleChannelSliceClick = (
    e: MouseEvent,
    tagName: string,
    channelId: string,
  ) => {
    e.stopPropagation();
    const query = addToken("", "tag", tagName);
    const nextParams = new URLSearchParams();
    nextParams.set("q", query);
    nextParams.set("channel", channelId);
    navigate(`/search?${nextParams.toString()}`);
  };

  const totalTags = aggregatedTags.length;
  const totalThreads = Number(statsData?.total_threads || 0);
  const isPageLoading = isChannelsLoading || isStatsLoading;
  const maxTagCount =
    Math.max(...filteredTags.map((tag) => tag.totalCount), 0) || 1;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden text-(--od-text-primary)">
      <div className="animate-in fade-in duration-500 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:gap-14">
          <div>
            <FluidDivider
              label="Tags"
              tone="strong"
              className="mb-8 lg:mb-10"
            />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--od-surface-soft) text-(--od-accent)">
                  <TagIcon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--od-text-tertiary)">
                    Tag Intelligence
                  </p>
                  <div className="space-y-1.5">
                    <h1 className="od-section-title">标签总览</h1>
                    <p className="max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
                      这里按标签名称聚合了跨频道热度，先看整体分布，再进入搜索页精准追帖。
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/search")}
                className="od-inline-action od-inline-action-ghost hidden sm:inline-flex"
              >
                返回搜索
              </button>
            </div>

            <div
              className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-500"
              style={{ animationDelay: "100ms" }}
            >
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-(--od-text-secondary)">
                    标签总数
                  </p>
                  <p className="text-[2rem] font-semibold tracking-tight text-(--od-text-value)">
                    {totalTags}
                  </p>
                  <p className="text-xs leading-5 text-(--od-text-tertiary)">
                    当前范围内去重后的标签数量。
                  </p>
                </div>
                <Hash className="mt-1 h-8 w-8 text-(--od-text-secondary)/26" />
              </div>

              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-(--od-text-secondary)">
                    相关帖子
                  </p>
                  <p className="text-[2rem] font-semibold tracking-tight text-(--od-text-value)">
                    {totalThreads}
                  </p>
                  <p className="text-xs leading-5 text-(--od-text-tertiary)">
                    被标签覆盖的帖子总量（含虚拟标签）。
                  </p>
                </div>
                <TrendingUp className="mt-1 h-8 w-8 text-(--od-text-secondary)/26" />
              </div>

              <div className="flex items-start justify-between gap-4 py-2 sm:col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-(--od-text-secondary)">
                    平均帖子 / 标签
                  </p>
                  <p className="text-[2rem] font-semibold tracking-tight text-(--od-text-value)">
                    {totalTags > 0 ? Math.round(totalThreads / totalTags) : 0}
                  </p>
                  <p className="text-xs leading-5 text-(--od-text-tertiary)">
                    用于快速判断标签池整体活跃度。
                  </p>
                </div>
                <TagIcon className="mt-1 h-8 w-8 text-(--od-text-secondary)/26" />
              </div>
            </div>
          </div>

          <section className="px-1">
            <FluidDivider label="Tag Browser" className="mb-8 lg:mb-10" />
            <div className="mb-8 flex items-start gap-4 lg:mb-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--od-surface-soft) text-(--od-accent)">
                <Search className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h2 className="od-section-title">筛选标签范围</h2>
                <p className="max-w-3xl text-sm leading-6 text-(--od-text-secondary)">
                  支持按频道查看标签池；同名标签会自动聚合展示，每个标签仅显示
                  Top 3 频道来源。
                </p>
              </div>
            </div>

            <div
              className="animate-in fade-in slide-in-from-top-4 duration-500"
              style={{ animationDelay: "200ms" }}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-(--od-text-tertiary)">
                <span className="rounded-full border border-(--od-shell-line) px-2.5 py-1">
                  频道视图:{" "}
                  <span className="text-(--od-text-secondary)">
                    {selectedChannelName}
                  </span>
                </span>
                <span>同名标签已聚合</span>
                <span>频道展示 Top {TOP_CHANNEL_SLICE_COUNT}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                <Select
                  value={selectedChannelId}
                  options={[
                    { value: ALL_CHANNELS_VALUE, label: '全部频道' },
                    ...channelOptions.map((ch) => ({ value: ch.id, label: ch.name })),
                  ]}
                  onChange={(v) => setSelectedChannelId(v)}
                  className="w-full"
                />
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-(--od-text-tertiary)" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索标签或频道..."
                    className="w-full rounded-2xl border border-(--od-shell-line) bg-[color-mix(in_srgb,var(--od-surface-input)_70%,transparent)] py-3.5 pl-12 pr-4 text-(--od-text-primary) placeholder:text-(--od-text-tertiary) focus:border-(--od-accent) focus:outline-hidden focus:ring-2 focus:ring-(--od-accent)/16"
                  />
                </div>
              </div>
            </div>
          </section>

          {isPageLoading ? (
            <div
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 ${
                sidebarCollapsed
                  ? "lg:grid-cols-4 xl:grid-cols-5"
                  : "lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-(--od-surface-soft)"
                />
              ))}
            </div>
          ) : filteredTags.length > 0 ? (
            <div
              className={`grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:gap-x-8 lg:gap-y-3 ${
                sidebarCollapsed
                  ? "lg:grid-cols-4 xl:grid-cols-5"
                  : "lg:grid-cols-3 xl:grid-cols-4"
              } animate-in fade-in duration-500`}
              style={{ animationDelay: "300ms" }}
            >
              {filteredTags.map((tag, index) => (
                <button
                  key={tag.key}
                  onClick={() => handleTagClick(tag)}
                  className="group relative flex min-h-[168px] w-full flex-col py-3 text-left transition-colors duration-200"
                  style={{ animationDelay: `${300 + index * 24}ms` }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[1.02rem] font-semibold tracking-tight text-(--od-text-primary) transition-colors group-hover:text-(--od-accent)">
                          {tag.name}
                        </h3>
                        {tag.hasVirtual && (
                          <span className="rounded-full border border-(--od-accent)/30 bg-(--od-accent)/10 px-2 py-0.5 text-[10px] font-semibold text-(--od-accent)">
                            虚拟
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-(--od-text-tertiary)">
                        同名标签聚合视图
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold tracking-tight text-(--od-accent)">
                        {tag.totalCount}
                      </p>
                      <p className="text-[11px] text-(--od-text-tertiary)">
                        帖子
                      </p>
                    </div>
                  </div>

                  <div className="min-h-[56px] flex-1">
                    <div className="flex min-h-[56px] flex-col items-stretch gap-1.5">
                      {tag.topChannelSlices.map((slice) => (
                        <div
                          key={`${tag.key}-${slice.channelId}-${slice.isVirtual ? "v" : "r"}`}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={(e) =>
                              handleChannelSliceClick(
                                e,
                                tag.name,
                                slice.channelId,
                              )
                            }
                            className="truncate text-left text-xs text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                            title={`在频道 ${slice.channelName} 中搜索标签 ${tag.name}`}
                          >
                            {slice.channelName}
                          </button>
                          <span className="text-[11px] tabular-nums text-(--od-text-tertiary)">
                            {slice.count}
                          </span>
                        </div>
                      ))}
                      {tag.remainingChannels > 0 && (
                        <span className="mb-2 block text-[11px] leading-none text-(--od-text-tertiary)">
                          +{tag.remainingChannels} 频道
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-4 h-[2px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--od-text-secondary)_10%,transparent)]">
                    <div
                      className="h-full bg-linear-to-r from-(--od-accent)/50 to-(--od-accent) transition-all duration-500"
                      style={{
                        width: `${Math.min((tag.totalCount / maxTagCount) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-10">
              <div className="text-center">
                <Search className="mx-auto mb-4 h-16 w-16 text-(--od-text-tertiary)" />
                <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
                  没有找到匹配的标签
                </h3>
                <p className="text-(--od-text-secondary)">
                  换个关键词试试看？或者切换一下频道范围。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
