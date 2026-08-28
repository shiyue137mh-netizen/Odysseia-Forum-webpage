import { describe, expect, it } from "vitest";

import type { Thread } from "@/entities/thread/types";
import { hasViewerFlag } from "@/entities/thread/lib/viewerFlags";

describe("hasViewerFlag", () => {
  it("缺省 viewer_flags 时返回 false", () => {
    expect(hasViewerFlag({} as Thread, "followed")).toBe(false);
  });

  it("只匹配指定的查看者状态", () => {
    const thread = {
      viewer_flags: ["followed", "unread"],
    } as Thread;

    expect(hasViewerFlag(thread, "followed")).toBe(true);
    expect(hasViewerFlag(thread, "followed_author")).toBe(false);
  });
});
