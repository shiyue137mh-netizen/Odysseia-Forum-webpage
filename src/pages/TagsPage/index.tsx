import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { addToken } from "@/shared/lib/searchTokenizer";
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
  normalizedChannelSearch: string;
}

interface ChannelTagGroup {
  channelId: string;
  channelName: string;
  tags: Array<{
    name: string;
    count: number;
    isVirtual: boolean;
  }>;
}

const ALL_CHANNELS_VALUE = "__all__";

export function TagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] =
    useState<string>(ALL_CHANNELS_VALUE);
  const navigate = useNavigate();

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
      grouped.set(item.tag_name, base);
    });

    return Array.from(grouped.values())
      .map((tag) => {
        const sortedSlices = [...tag.channelSlices].sort(
          (a, b) => b.count - a.count,
        );
        const normalizedChannelSearch = sortedSlices
          .map((slice) => slice.channelName.toLowerCase())
          .join(" ");

        return {
          ...tag,
          channelSlices: sortedSlices,
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

  const channelTagGroups = useMemo<ChannelTagGroup[]>(() => {
    const groups = new Map<string, ChannelTagGroup>();
    const query = searchQuery.trim().toLowerCase();

    filteredTags.forEach((tag) => {
      tag.channelSlices.forEach((slice) => {
        if (
          query &&
          !tag.name.toLowerCase().includes(query) &&
          !slice.channelName.toLowerCase().includes(query)
        ) {
          return;
        }
        const group = groups.get(slice.channelId) || {
          channelId: slice.channelId,
          channelName: slice.channelName,
          tags: [],
        };
        const existing = group.tags.find((item) => item.name === tag.name);

        if (existing) {
          existing.count += slice.count;
          existing.isVirtual &&= slice.isVirtual;
        } else {
          group.tags.push({
            name: tag.name,
            count: slice.count,
            isVirtual: slice.isVirtual,
          });
        }
        groups.set(slice.channelId, group);
      });
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        tags: group.tags.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN")),
      }))
      .sort((a, b) => {
        const aIndex = channelOptions.findIndex((channel) => channel.id === a.channelId);
        const bIndex = channelOptions.findIndex((channel) => channel.id === b.channelId);
        if (aIndex === -1 && bIndex === -1) return a.channelName.localeCompare(b.channelName, "zh-CN");
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [channelOptions, filteredTags, searchQuery]);

  const handleTagClick = (tagName: string, channelId: string) => {
    const query = addToken("", "tag", tagName);
    const nextParams = new URLSearchParams();
    nextParams.set("q", query);
    nextParams.set("channel", channelId);
    navigate(`/search?${nextParams.toString()}`);
  };

  const totalTags = aggregatedTags.length;
  const totalThreads = Number(statsData?.total_threads || 0);
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
                <span>按频道分组展示</span>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-(--od-surface-soft)"
                />
              ))}
            </div>
          ) : channelTagGroups.length > 0 ? (
            <div className="space-y-8 animate-in fade-in duration-500" style={{ animationDelay: "300ms" }}>
              {channelTagGroups.map((group) => (
                <section key={group.channelId}>
                  <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="text-sm font-semibold text-(--od-text-primary)">{group.channelName}</h2>
                    <span className="text-xs text-(--od-text-tertiary)">{group.tags.length} 个标签</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {group.tags.map((tag) => (
                      <button
                        key={`${group.channelId}-${tag.name}`}
                        type="button"
                        onClick={() => handleTagClick(tag.name, group.channelId)}
                        className="group inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-soft) hover:text-(--od-accent)"
                        title={`在频道 ${group.channelName} 中搜索标签 ${tag.name}`}
                      >
                        <span>{tag.name}</span>
                        {tag.isVirtual && <span className="text-[10px] text-(--od-accent)">虚拟</span>}
                        <span className="text-[11px] tabular-nums text-(--od-text-tertiary) group-hover:text-(--od-accent)">{tag.count}</span>
                      </button>
                    ))}
                  </div>
                </section>
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
