import { describe, expect, it } from "vitest";

import { buildChannelTagCatalog, type ApiChannel } from "./useChannels";

describe("buildChannelTagCatalog", () => {
  it("从频道 authority 派生并去重主频道、映射频道和虚拟标签", () => {
    const channels: ApiChannel[] = [{
      guild_id: "guild-1",
      channel_id: "channel-1",
      name: "频道一",
      available_tags: [
        { tag_id: 1, name: "共享" },
        { tag_id: 2, name: "主频道" },
      ],
      virtual_tags: [
        { tag_name: "虚拟", source_channel_ids: ["source-1"] },
      ],
      mapped_source_channels: [{
        channel_id: "source-1",
        channel_name: "来源",
        available_tags: [
          { tag_id: 3, name: "共享" },
          { tag_id: 4, name: "来源标签" },
        ],
      }],
      real_thread_count: 0,
      virtual_thread_count: 0,
      total_thread_count: 0,
    }];

    expect(buildChannelTagCatalog(channels)).toEqual([{
      channel_id: "channel-1",
      channel_name: "频道一",
      available_tags: ["共享", "主频道", "来源标签"],
      virtual_tags: ["虚拟"],
    }]);
  });
});
