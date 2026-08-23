import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Thread } from "@/entities/thread/types";
import { ThreadResultsCollection } from "@/features/threads/components/ThreadResultsCollection";

vi.mock("@/shared/hooks/useSettings", () => ({
  useLayoutMode: () => "grid",
}));

vi.mock("@/features/threads/components/ThreadCard", () => ({
  ThreadCard: ({
    thread,
    resultPage,
  }: {
    thread: Thread;
    resultPage?: number;
  }) => (
    <article
      data-testid={`thread-${thread.thread_id}`}
      data-result-page={resultPage}
    />
  ),
}));

vi.mock("@/features/threads/components/ThreadListItem", () => ({
  ThreadListItem: ({
    thread,
    resultPage,
    renderSecondaryImages,
  }: {
    thread: Thread;
    resultPage?: number;
    renderSecondaryImages?: boolean;
  }) => (
    <article
      data-testid={`thread-${thread.thread_id}`}
      data-result-page={resultPage}
      data-secondary-images={String(renderSecondaryImages)}
    />
  ),
}));

const threads = ["1", "2", "3"].map(
  (threadId) => ({ thread_id: threadId }) as Thread,
);

describe("ThreadResultsCollection", () => {
  const observerInstances: Array<{
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  beforeEach(() => {
    observerInstances.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();

        constructor() {
          observerInstances.push(this);
        }
      },
    );
  });

  it("追加结果时复用 Observer 且只观察新增卡片", () => {
    const pageByThreadId = new Map([
      ["1", 1],
      ["2", 1],
      ["3", 2],
    ]);
    const onViewedPageChange = vi.fn();
    const { rerender } = render(
      <ThreadResultsCollection
        threads={threads.slice(0, 2)}
        layoutMode="grid"
        pageByThreadId={pageByThreadId}
        onViewedPageChange={onViewedPageChange}
      />,
    );

    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0].observe).toHaveBeenCalledTimes(2);

    rerender(
      <ThreadResultsCollection
        threads={threads}
        layoutMode="grid"
        pageByThreadId={pageByThreadId}
        onViewedPageChange={onViewedPageChange}
      />,
    );

    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0].observe).toHaveBeenCalledTimes(3);
    expect(observerInstances[0].disconnect).not.toHaveBeenCalled();
  });

  it("移动端列表不创建次要图片内容", () => {
    render(
      <ThreadResultsCollection
        threads={threads.slice(0, 1)}
        layoutMode="list"
      />,
    );

    expect(screen.getByTestId("thread-1")).toHaveAttribute(
      "data-secondary-images",
      "false",
    );
  });
});
