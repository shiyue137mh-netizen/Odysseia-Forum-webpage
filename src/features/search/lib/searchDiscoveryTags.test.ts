import { beforeEach, describe, expect, it } from "vitest";

import {
  chooseDiscoveryTags,
  chooseSuggestedTags,
  getStoredDiscoveryTags,
  saveDiscoveryTags,
} from "@/features/search/lib/searchDiscoveryTags";

describe("searchDiscoveryTags", () => {
  beforeEach(() => window.localStorage.clear());

  it("按作用域保存并恢复两个仍然有效的标签", () => {
    saveDiscoveryTags("global", ["绘画", "音乐"], 1);
    expect(getStoredDiscoveryTags("global", ["音乐", "绘画", "游戏"])).toEqual([
      "绘画",
      "音乐",
    ]);
    expect(getStoredDiscoveryTags("global", ["绘画"])).toBeNull();
  });

  it("再次抽取时优先避开当前标签", () => {
    expect(
      chooseDiscoveryTags(["A", "B", "C", "D"], ["A", "B"], () => 0),
    ).toEqual(["D", "C"]);
  });

  it("搜索建议优先当前频道，同时保留其他频道标签", () => {
    const result = chooseSuggestedTags(
      ["当前A", "当前B", "当前C", "当前D", "当前E", "其他"],
      ["当前A", "当前B", "当前C", "当前D", "当前E"],
      5,
      () => 0,
    );

    expect(result).toHaveLength(5);
    expect(result.filter((tag) => tag.startsWith("当前"))).toHaveLength(4);
    expect(result).toContain("其他");
  });
});
