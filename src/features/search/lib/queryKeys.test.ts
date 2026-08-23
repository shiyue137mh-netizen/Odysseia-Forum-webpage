import { describe, expect, it } from "vitest";

import { searchKeys } from "./queryKeys";

describe("searchKeys.suggestions", () => {
  it("只使用实际请求参数区分搜索建议缓存", () => {
    expect(
      searchKeys.suggestions({
        query: "作者",
        applyPreferences: true,
      }),
    ).toEqual(["search", "suggestions", {
      query: "作者",
      applyPreferences: true,
    }]);
  });
});
