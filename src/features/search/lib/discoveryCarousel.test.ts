import { describe, expect, it } from "vitest";

import { getWrappedCarouselIndex } from "@/features/search/lib/discoveryCarousel";

describe("getWrappedCarouselIndex", () => {
  it("在轨道首尾之间循环切换", () => {
    expect(getWrappedCarouselIndex(0, -1, 8)).toBe(7);
    expect(getWrappedCarouselIndex(7, 1, 8)).toBe(0);
    expect(getWrappedCarouselIndex(3, 1, 8)).toBe(4);
  });
});
