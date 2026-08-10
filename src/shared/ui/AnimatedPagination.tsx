import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

interface AnimatedPaginationProps {
  currentPage: number; // 1-indexed
  totalPages: number;
  onChange: (page: number) => void;
  maxVisible?: number;
  totalItems?: number;
  sequential?: boolean;
}

export function AnimatedPagination({
  currentPage,
  totalPages,
  onChange,
  maxVisible = 5,
  totalItems,
  sequential = false,
}: AnimatedPaginationProps) {
  const [jumpValue, setJumpValue] = useState(String(currentPage));

  useEffect(() => {
    setJumpValue(String(currentPage));
  }, [currentPage]);

  // 计算需要显示的页码范围
  const visiblePages = useMemo(() => {
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages, maxVisible]);

  const commitJump = () => {
    const page = Number(jumpValue);
    if (!Number.isInteger(page)) {
      setJumpValue(String(currentPage));
      return;
    }

    const nextPage = Math.max(1, Math.min(totalPages, page));
    setJumpValue(String(nextPage));
    if (nextPage !== currentPage) {
      onChange(nextPage);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="my-8 flex w-full flex-col items-center justify-center gap-4">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* 第一页 (最新一页) */}
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={currentPage === 1}
          className="group flex h-10 items-center justify-center rounded-full px-3 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-hover) hover:text-(--od-text-primary) disabled:pointer-events-none disabled:opacity-30"
          title="第一页 (最新一页)"
        >
          <ChevronsLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">第一页</span>
        </button>

        {/* 上一页 */}
        <button
          type="button"
          onClick={() => onChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="group flex h-10 items-center justify-center rounded-full px-3 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-hover) hover:text-(--od-text-primary) disabled:pointer-events-none disabled:opacity-30"
          title="上一页"
        >
          <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">上一页</span>
        </button>

        {/* 轮播页码区域 */}
        {!sequential && <div className="relative mx-2 flex h-12 items-center justify-center gap-1 overflow-hidden px-2 sm:gap-2">
          <AnimatePresence mode="popLayout">
            {visiblePages.map((page) => {
              const isActive = page === currentPage;
              const diff = Math.abs(page - currentPage);

              return (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{
                    opacity: isActive ? 1 : Math.max(0.3, 0.7 - diff * 0.15),
                    scale: isActive ? 1.25 : Math.max(0.85, 1 - diff * 0.05),
                    x: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8,
                  }}
                  key={page}
                  onClick={() => onChange(page)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold transition-colors ${
                    isActive
                      ? "text-(--od-accent) drop-shadow-[0_2px_4px_var(--od-accent-shadow)]"
                      : "text-(--od-text-secondary) hover:bg-(--od-surface-hover) hover:text-(--od-text-primary)"
                  }`}
                >
                  {page}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>}

        {sequential && (
          <div className="flex h-12 min-w-16 items-center justify-center text-sm font-bold text-(--od-accent)">
            第 {currentPage} 页
          </div>
        )}

        {/* 下一页 */}
        <button
          type="button"
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="group flex h-10 items-center justify-center rounded-full px-3 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-hover) hover:text-(--od-text-primary) disabled:pointer-events-none disabled:opacity-30"
          title="下一页"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* 最后一页 */}
        {!sequential && <button
          type="button"
          onClick={() => onChange(totalPages)}
          disabled={currentPage === totalPages}
          className="group flex h-10 items-center justify-center rounded-full px-3 text-sm font-medium text-(--od-text-secondary) transition-colors hover:bg-(--od-surface-hover) hover:text-(--od-text-primary) disabled:pointer-events-none disabled:opacity-30"
          title="最后一页"
        >
          <span className="hidden sm:inline">最后一页</span>
          <ChevronsRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>}
      </div>
      <div className="text-xs font-medium tracking-wide text-(--od-text-tertiary)">
        第 {currentPage} / {totalPages} 页 {totalItems !== undefined && `· 共 ${totalItems} 条`}
      </div>
      {!sequential && <div className="flex items-center gap-2 text-xs text-(--od-text-secondary)">
        <span>跳转到</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(event) => setJumpValue(event.target.value)}
          onBlur={commitJump}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-label="跳转页码"
          className="od-ghost-input h-8 w-20 px-1 text-center text-sm font-medium"
        />
        <span>页</span>
      </div>}
    </div>
  );
}
