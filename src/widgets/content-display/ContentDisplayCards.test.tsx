import { fireEvent, render, screen } from "@/tests/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Thread } from "@/entities/thread/types";
import { ThreadRankingPanel } from "@/widgets/content-display/ContentDisplayCards";

function makeThread(id: string, title: string, reactionCount: number): Thread {
  return {
    thread_id: id,
    guild_id: "guild",
    channel_id: "channel",
    title,
    author: null,
    created_at: "2026-07-13T10:00:00Z",
    reaction_count: reactionCount,
    reply_count: reactionCount / 2,
    collection_count: reactionCount / 4,
    display_count: 0,
    thumbnail_urls: [],
    tags: [],
    virtual_tags: [],
    collected_flag: false,
  } as Thread;
}

describe("ThreadRankingPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("根据滚轮中心切换当前项，并打开对应帖子", () => {
    const threads = [
      makeThread("1", "第一名", 30),
      makeThread("2", "第二名", 20),
      makeThread("3", "第三名", 10),
      makeThread("4", "第四名", 9),
      makeThread("5", "第五名", 8),
      makeThread("6", "第六名", 7),
      makeThread("7", "第七名", 6),
    ];
    const onOpen = vi.fn();

    render(
      <ThreadRankingPanel
        title="点赞飙升"
        badge="近 7 天"
        threads={threads}
        metric="reaction"
        onOpen={onOpen}
        onRefresh={vi.fn()}
      />,
    );

    const viewport = screen.getByRole("region", {
      name: "点赞飙升排行，可上下滚动",
    });
    const thirdButton = screen.getByRole("button", { name: "3第三名10" });
    expect(thirdButton).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "打开帖子：第三名" }));
    expect(onOpen).toHaveBeenCalledWith(threads[2]);
    onOpen.mockClear();

    fireEvent.pointerEnter(screen.getByRole("button", { name: "2第二名20" }), {
      pointerType: "mouse",
    });
    expect(thirdButton).toHaveAttribute("aria-current", "true");

    Object.defineProperty(viewport, "scrollTop", {
      value: 132,
      writable: true,
    });
    fireEvent.scroll(viewport);
    const fourthButton = screen.getByRole("button", { name: "4第四名9" });
    expect(fourthButton).toHaveAttribute("aria-current", "true");

    fireEvent.click(fourthButton);
    expect(onOpen).toHaveBeenCalledWith(threads[3]);

    const scrollTo = vi.fn();
    Object.defineProperty(viewport, "scrollTo", { value: scrollTo });
    fireEvent.focus(screen.getByRole("button", { name: "6第六名7" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 220, behavior: "smooth" });
  });

  it("滚轮输入带阻尼，每个锁定周期只推进一项", () => {
    vi.useFakeTimers();
    const threads = Array.from({ length: 7 }, (_, index) =>
      makeThread(String(index + 1), `第${index + 1}名`, 20 - index),
    );

    render(
      <ThreadRankingPanel
        title="点赞飙升"
        badge="近 7 天"
        threads={threads}
        metric="reaction"
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    const viewport = screen.getByRole("region", {
      name: "点赞飙升排行，可上下滚动",
    });
    const scrollTo = vi.fn();
    Object.defineProperty(viewport, "scrollTo", { value: scrollTo });

    fireEvent.wheel(viewport, { deltaY: 120 });
    fireEvent.wheel(viewport, { deltaY: 120 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 132, behavior: "smooth" });

    vi.advanceTimersByTime(220);
    Object.defineProperty(viewport, "scrollTop", {
      value: 132,
      writable: true,
    });
    fireEvent.scroll(viewport);
    fireEvent.wheel(viewport, { deltaY: 120 });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 176, behavior: "smooth" });
  });
});
