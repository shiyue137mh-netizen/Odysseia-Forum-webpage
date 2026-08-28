import { ThreadCard } from "@/features/threads/components/ThreadCard";
import { ThreadListItem } from "@/features/threads/components/ThreadListItem";
import type { Thread } from "@/entities/thread/types";
import { useLayoutMode } from "@/shared/hooks/useSettings";
import type { LayoutMode } from "@/shared/hooks/useLayoutPreference";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ThreadResultsCollectionProps {
  threads: Thread[];
  onPreview?: (thread: Thread) => void;
  onTagClick?: (tagName: string) => void;
  onAuthorClick?: (author: { id: string; name: string }) => void;
  searchQuery?: string;
  gridClassName?: string;
  listClassName?: string;
  layoutMode?: LayoutMode;
  animateIn?: boolean;
  pageByThreadId?: ReadonlyMap<string, number>;
  onViewedPageChange?: (page: number) => void;
  onApplyBanner?: (thread: Thread) => void;
}

const DEFAULT_GRID_CLASS =
  "grid auto-rows-fr grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const DEFAULT_LIST_CLASS = "flex flex-col space-y-od-list-gap";

function getMasonryColumnCount(width: number) {
  if (width < 640) return 1;
  if (width < 900) return 2;
  if (width < 1200) return 3;
  return 4;
}

function MasonryItem({
  children,
  itemId,
  onHeightChange,
}: {
  children: React.ReactNode;
  itemId: string;
  onHeightChange: (itemId: string, height: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      onHeightChange(itemId, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [itemId, onHeightChange]);

  return <div ref={ref}>{children}</div>;
}

function ThreadResultsCollectionImpl({
  threads,
  onPreview,
  onTagClick,
  onAuthorClick,
  searchQuery,
  gridClassName = DEFAULT_GRID_CLASS,
  listClassName = DEFAULT_LIST_CLASS,
  layoutMode: controlledLayoutMode,
  animateIn,
  pageByThreadId,
  onViewedPageChange,
  onApplyBanner,
}: ThreadResultsCollectionProps) {
  const fallbackLayoutMode = useLayoutMode();
  const layoutMode = controlledLayoutMode ?? fallbackLayoutMode;
  const collectionRef = useRef<HTMLDivElement>(null);
  const viewedPageCallbackRef = useRef(onViewedPageChange);
  const pageObserverRef = useRef<IntersectionObserver | null>(null);
  const observedPageElementsRef = useRef(new Set<HTMLElement>());
  const visiblePageElementsRef = useRef(new Map<HTMLElement, number>());
  const [renderSecondaryListImages, setRenderSecondaryListImages] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 768px)").matches,
  );
  const [masonryColumnCount, setMasonryColumnCount] = useState(() =>
    typeof window === "undefined"
      ? 5
      : getMasonryColumnCount(window.innerWidth),
  );
  const assignmentsRef = useRef(new Map<string, number>());
  const heightsRef = useRef(new Map<string, number>());
  const assignmentColumnCountRef = useRef(masonryColumnCount);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setRenderSecondaryListImages(mediaQuery.matches);
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    viewedPageCallbackRef.current = onViewedPageChange;
  }, [onViewedPageChange]);

  useEffect(() => {
    const element = collectionRef.current;
    if (!element || layoutMode !== "masonry") return;
    const observer = new ResizeObserver(([entry]) => {
      const nextCount = getMasonryColumnCount(entry.contentRect.width);
      setMasonryColumnCount((current) =>
        current === nextCount ? current : nextCount,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [layoutMode]);

  const tracksViewedPage = Boolean(pageByThreadId && onViewedPageChange);

  useEffect(() => {
    if (!tracksViewedPage) return;
    const observedPageElements = observedPageElementsRef.current;
    const visiblePageElements = visiblePageElementsRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const targetEl = entry.target as HTMLElement;
          const page = Number(targetEl.dataset.resultPage || 1);
          if (entry.isIntersecting) {
            visiblePageElements.set(targetEl, page);
          } else {
            visiblePageElements.delete(targetEl);
          }
        }

        if (visiblePageElements.size === 0) return;

        // 计算当前视口中最靠近顶部上方（120px 处）的可见卡片页码
        let closestPage = 1;
        let minDistance = Infinity;

        visiblePageElements.forEach((page, el) => {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - 120);
          if (dist < minDistance) {
            minDistance = dist;
            closestPage = page;
          }
        });

        viewedPageCallbackRef.current?.(closestPage);
      },
      { threshold: [0, 0.1, 0.5] },
    );

    pageObserverRef.current = observer;
    return () => {
      observer.disconnect();
      pageObserverRef.current = null;
      observedPageElements.clear();
      visiblePageElements.clear();
    };
  }, [tracksViewedPage]);

  useEffect(() => {
    const element = collectionRef.current;
    const observer = pageObserverRef.current;
    if (!element || !observer || !tracksViewedPage) return;

    const nextElements = new Set(
      element.querySelectorAll<HTMLElement>("[data-result-page]"),
    );

    for (const observedElement of observedPageElementsRef.current) {
      if (nextElements.has(observedElement)) continue;
      observer.unobserve(observedElement);
      observedPageElementsRef.current.delete(observedElement);
      visiblePageElementsRef.current.delete(observedElement);
    }

    for (const resultElement of nextElements) {
      if (observedPageElementsRef.current.has(resultElement)) continue;
      observer.observe(resultElement);
      observedPageElementsRef.current.add(resultElement);
    }
  }, [layoutMode, threads, tracksViewedPage]);

  const masonryColumns = useMemo(() => {
    if (assignmentColumnCountRef.current !== masonryColumnCount) {
      assignmentsRef.current.clear();
      heightsRef.current.clear();
      assignmentColumnCountRef.current = masonryColumnCount;
    }
    const currentIds = new Set(threads.map((thread) => thread.thread_id));
    for (const id of assignmentsRef.current.keys()) {
      if (!currentIds.has(id)) {
        assignmentsRef.current.delete(id);
        heightsRef.current.delete(id);
      }
    }
    const columnHeights = Array.from({ length: masonryColumnCount }, () => 0);
    const columns = Array.from(
      { length: masonryColumnCount },
      () =>
        [] as Array<{
          thread: Thread;
          index: number;
        }>,
    );

    threads.forEach((thread, index) => {
      let column = assignmentsRef.current.get(thread.thread_id);
      if (column === undefined || column >= masonryColumnCount) {
        column = columnHeights.indexOf(Math.min(...columnHeights));
        assignmentsRef.current.set(thread.thread_id, column);
      }
      columns[column].push({ thread, index });
      columnHeights[column] += heightsRef.current.get(thread.thread_id) || 520;
    });
    return columns;
  }, [masonryColumnCount, threads]);

  const recordMasonryHeight = useCallback(
    (threadId: string, height: number) => {
      if (Math.abs((heightsRef.current.get(threadId) || 0) - height) < 1)
        return;
      heightsRef.current.set(threadId, height);
    },
    [],
  );

  if (layoutMode === "masonry") {
    return (
      <div ref={collectionRef} className="flex items-start gap-6">
        {masonryColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-6">
            {column.map(({ thread, index }) => (
              <MasonryItem
                key={thread.thread_id}
                itemId={thread.thread_id}
                onHeightChange={recordMasonryHeight}
              >
                <ThreadCard
                  thread={thread}
                  index={index}
                  onTagClick={onTagClick}
                  searchQuery={searchQuery}
                  onAuthorClick={onAuthorClick}
                  onPreview={onPreview}
                  animateIn={animateIn}
                  resultPage={pageByThreadId?.get(thread.thread_id)}
                  onApplyBanner={onApplyBanner}
                  masonry
                />
              </MasonryItem>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={collectionRef}
      className={layoutMode === "list" ? listClassName : gridClassName}
    >
      {threads.map((thread, index) =>
        layoutMode === "list" ? (
          <ThreadListItem
            key={thread.thread_id}
            thread={thread}
            index={index}
            onTagClick={onTagClick}
            searchQuery={searchQuery}
            onAuthorClick={onAuthorClick}
            onPreview={onPreview}
            animateIn={animateIn}
            resultPage={pageByThreadId?.get(thread.thread_id)}
            renderSecondaryImages={renderSecondaryListImages}
            onApplyBanner={onApplyBanner}
          />
        ) : (
          <ThreadCard
            key={thread.thread_id}
            thread={thread}
            index={index}
            onTagClick={onTagClick}
            searchQuery={searchQuery}
            onAuthorClick={onAuthorClick}
            onPreview={onPreview}
            animateIn={animateIn}
            resultPage={pageByThreadId?.get(thread.thread_id)}
            onApplyBanner={onApplyBanner}
          />
        ),
      )}
    </div>
  );
}

export const ThreadResultsCollection = memo(ThreadResultsCollectionImpl);
