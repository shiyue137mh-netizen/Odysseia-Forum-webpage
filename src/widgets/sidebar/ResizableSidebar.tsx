import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ResizableSidebarProps {
  children: ReactNode;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  isCollapsed?: boolean;
}

export function ResizableSidebar({
  children,
  isMobileOpen = false,
  setIsMobileOpen,
  isCollapsed = false,
}: ResizableSidebarProps) {
  const sidebarWidth = 170;
  const asideRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMobileOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMobileOpen?.(false);
        return;
      }
      if (event.key !== "Tab") return;
      const aside = asideRef.current;
      if (!aside) return;
      const focusable = Array.from(aside.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      opener?.focus({ preventScroll: true });
    };
  }, [isMobileOpen, setIsMobileOpen]);
  const mobileAsideVisibilityClass = isMobileOpen
    ? "translate-x-0 opacity-100 visible pointer-events-auto"
    : "-translate-x-full opacity-0 invisible pointer-events-none";

  return (
    <>
      {/* 移动端遮罩 */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-all duration-300 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        ref={asideRef}
        style={{ width: `${sidebarWidth}px` }}
        className={`
          fixed left-0 top-0 z-50 h-screen transition-[transform,opacity,visibility] duration-300 lg:z-40
          bg-[color-mix(in_srgb,var(--od-bg-secondary)_88%,transparent)] backdrop-blur-xl
          will-change-transform lg:bg-transparent lg:backdrop-blur-none
          ${mobileAsideVisibilityClass}
          ${isCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}
          lg:visible lg:pointer-events-auto lg:opacity-100
        `}
        aria-hidden={isCollapsed && !isMobileOpen ? true : undefined}
        inert={isCollapsed && !isMobileOpen}
        role={isMobileOpen ? "dialog" : undefined}
        aria-modal={isMobileOpen ? true : undefined}
        aria-label={isMobileOpen ? "主菜单" : undefined}
      >
        {/* 移动端关闭按钮 — 偏右上角，避开 logo 区域 */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setIsMobileOpen?.(false)}
          className="absolute right-2 top-3 z-10 rounded-lg p-1.5 text-(--od-text-tertiary) hover:bg-(--od-bg-tertiary) hover:text-(--od-text-primary) lg:hidden"
          aria-label="关闭菜单"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 侧边栏内容 */}
        <div className="flex h-full flex-col overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}
