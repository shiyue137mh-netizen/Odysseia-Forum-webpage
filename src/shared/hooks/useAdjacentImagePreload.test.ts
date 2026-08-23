import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdjacentImagePreload } from "./useAdjacentImagePreload";

describe("useAdjacentImagePreload", () => {
  const loadedUrls: string[] = [];

  beforeEach(() => {
    loadedUrls.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        set src(value: string) {
          if (value) loadedUrls.push(value);
        }
      },
    );
  });

  it("只预加载当前图片相邻的前后两张", () => {
    const urls = ["one", "two", "three", "four"];
    renderHook(() => useAdjacentImagePreload(urls, 0));

    expect(loadedUrls).toEqual(["four", "two"]);
    expect(loadedUrls).not.toContain("three");
  });
});
