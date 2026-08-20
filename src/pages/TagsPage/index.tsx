import { useMemo, useState, type MouseEvent } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { addToken } from "@/shared/lib/searchTokenizer";
import { useSidebarCollapsedSetting } from "@/shared/hooks/useSettings";
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
    if (selectedChannelId === ALL_CHANNELS_VALUE) return "全部频道";
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

      base.hasVirtual =
        base.hasVirtual || item.channel_info.some((info) => info.is_virtual);
      // 统计值以后端 total_thread_count 为准
      base.totalCount = Number(item.total_thread_count || 0);
      grouped.set(item.tag_name, base);
    });

    const cards = Array.from(grouped.values()).map((tag) => {
      const sortedSlices = [...tag.channelSlices].sort(
        (a, b) => b.count - a.count,
      );
      const topChannelSlices = sortedSlices.slice(0, TOP_CHANNEL_SLICE_COUNT);
      const remainingChannels = Math.max(
        0,
        sortedSlices.length - TOP_CHANNEL_SLICE_COUNT,
      );
      const normalizedChannelSearch = sortedSlices
        .map((slice) => slice.channelName.toLowerCase())
        .join(" ");

      return {
        ...tag,
        channelSlices: sortedSlices,
        topChannelSlices,
        remainingChannels,
        normalizedChannelSearch,
      };
    });

    return cards.sort((a, b) => b.totalCount - a.totalCount);
  }, [channelMap, statsData]);

  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return aggregatedTags;
    return aggregatedTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        tag.normalizedChannelSearch.includes(query),
    );
  }, [aggregatedTags, searchQuery]);

  const totalThreads = Number(statsData?.total_threads || 0);
  const totalTags = aggregatedTags.length;
  const maxTagCount = useMemo(
    () =>
      aggregatedTags.length > 0
        ? Math.max(...aggregatedTags.map((tag) => tag.totalCount))
        : 1,
    [aggregatedTags],
  );

  const handleTagClick = (tag: AggregatedTagCard) => {
    const query = addToken("", "tag", tag.name);
    const nextParams = new URLSearchParams();
    nextParams.set("q", query);
    if (selectedChannelId !== ALL_CHANNELS_VALUE) {
      nextParams.set("channel", selectedChannelId);
    }
    navigate(`/search?${nextParams.toString()}`);
  };

  const handleChannelSliceClick = (
    event: MouseEvent,
    tagName: string,
    channelId: string,
  ) => {
    event.stopPropagation();
    const query = addToken("", "tag", tagName);
    const nextParams = new URLSearchParams();
    nextParams.set("q", query);
    nextParams.set("channel", channelId);
    navigate(`/search?${nextParams.toString()}`);
  };

  const isPageLoading = isChannelsLoading || isStatsLoading;

  return (
    <div className="flex min-h-full flex-col overflow-x-clip text-(--od-text-primary)">
      <div className="animate-in fade-in duration-500 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">
          <div>
            <div className="od-page-heading flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="od-page-title">标签总览</h1>
              <button
                type="button"
                onClick={() => navigate("/search")}
                className="od-inline-action od-inline-action-ghost hidden sm:inline-flex"
              >
                返回搜索
              </button>
            </div>

            <div
              className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-500"
              style={{ animationDelay: "100ms" }}
            >
              <div className="py-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-(--od-text-secondary)">
                    标签总数
                  </p>
                  <p className="text-[2rem] font-semibold tracking-tight text-(--od-text-value)">
                    {totalTags}
                  </p>
                </div>
              </div>

              <div className="py-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-(--od-text-secondary)">
                    相关帖子
                  </p>
                  <p className="text-[2rem] font-semibold tracking-tight text-(--od-text-value)">
                    {totalThreads}
                  </p>
                </div>
              </div>

              <div className="py-2 sm:col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-(--od-text-secondary)">
                    平均帖子 / 标签
                  </p>
                  <p className="text-[2rem] font-semibold tracking-tight text-(--od-text-value)">
                    {totalTags > 0 ? Math.round(totalThreads / totalTags) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="px-1">
            <h2 className="od-section-title mb-5 lg:mb-6">筛选标签范围</h2>

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
                <span>展示前三个频道</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                <Select
                  value={selectedChannelId}
                  options={[
                    { value: ALL_CHANNELS_VALUE, label: "全部频道" },
                    ...channelOptions.map((ch) => ({
                      value: ch.id,
                      label: ch.name,
                    })),
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
                    className="od-ghost-input min-h-10 w-full pl-10 pr-1 text-(--od-text-primary) placeholder:text-(--od-text-tertiary)"
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
