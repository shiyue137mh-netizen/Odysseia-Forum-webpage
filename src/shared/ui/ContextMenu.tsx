import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { clsx } from "clsx";

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuContextType {
  isOpen: boolean;
  position: ContextMenuPosition;
  openMenu: (pos: ContextMenuPosition) => void;
  closeMenu: () => void;
  menuId: string;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within a ContextMenu");
  }
  return context;
}

interface ContextMenuProps {
  children: ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const menuId = useId();

  const openMenu = useCallback((pos: ContextMenuPosition) => {
    setPosition(pos);
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ContextMenuContext.Provider
      value={{
        isOpen,
        position,
        openMenu,
        closeMenu,
        menuId,
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
}

interface ContextMenuTriggerProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function ContextMenuTrigger({
  children,
  className,
  disabled = false,
}: ContextMenuTriggerProps) {
  const { openMenu } = useContextMenu();
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu({ x: e.clientX, y: e.clientY });
    },
    [disabled, openMenu],
  );

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (disabled) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      isLongPressTriggeredRef.current = false;

      clearLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        try {
          navigator.vibrate?.(15);
        } catch {
          // ignore vibration support errors
        }
        openMenu({ x: touch.clientX, y: touch.clientY });
      }, 500);
    },
    [clearLongPress, disabled, openMenu],
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (!touchStartPosRef.current) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
      // 如果滑动超过 10px，视为用户在正常滚动列表，取消长按呼起
      if (deltaX > 10 || deltaY > 10) {
        clearLongPress();
      }
    },
    [clearLongPress],
  );

  const handleTouchEnd = useCallback(() => {
    clearLongPress();
    touchStartPosRef.current = null;
  }, [clearLongPress]);

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={className}
    >
      {children}
    </div>
  );
}

interface ContextMenuContentProps {
  children: ReactNode;
  className?: string;
}

export function ContextMenuContent({
  children,
  className,
}: ContextMenuContentProps) {
  const { isOpen, position, closeMenu, menuId } = useContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<ContextMenuPosition>(position);

  // 视口边缘防溢出吸附计算
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const menuEl = menuRef.current;
    const rect = menuEl.getBoundingClientRect();
    const padding = 12;

    let targetX = position.x;
    let targetY = position.y;

    if (targetX + rect.width > window.innerWidth - padding) {
      targetX = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    if (targetY + rect.height > window.innerHeight - padding) {
      targetY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setAdjustedPos({ x: targetX, y: targetY });
  }, [isOpen, position]);

  // 点击外部或按 Esc 关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [closeMenu, isOpen]);

  if (typeof document === "undefined" || !isOpen) return null;

  return createPortal(
    <div
      id={menuId}
      className="fixed inset-0 z-50 pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeMenu();
      }}
    >
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.94, y: -2 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          left: `${adjustedPos.x}px`,
          top: `${adjustedPos.y}px`,
        }}
        className={clsx(
          "z-50 min-w-[180px] overflow-hidden rounded-xl border border-(--od-border-subtle) bg-(--od-surface-content) p-1.5 text-(--od-text-primary) shadow-2xl shadow-black/35",
          className,
        )}
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

interface ContextMenuItemProps {
  children: ReactNode;
  onClick?: (e: ReactMouseEvent) => void;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: "default" | "danger";
  className?: string;
}

export function ContextMenuItem({
  children,
  onClick,
  icon,
  disabled = false,
  variant = "default",
  className,
}: ContextMenuItemProps) {
  const { closeMenu } = useContextMenu();

  const handleClick = (e: ReactMouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    closeMenu();
    onClick?.(e);
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors focus:outline-hidden",
        disabled && "cursor-not-allowed opacity-45",
        !disabled &&
          variant === "default" &&
          "text-(--od-text-primary) hover:bg-(--od-hover-surface) hover:text-(--od-accent)",
        !disabled &&
          variant === "danger" &&
          "text-(--od-error) hover:bg-(--od-error)/15 hover:text-(--od-error)",
        className,
      )}
    >
      {icon && (
        <span
          className={clsx(
            "flex h-4 w-4 shrink-0 items-center justify-center transition-colors",
            variant === "default"
              ? "text-(--od-text-tertiary) group-hover:text-(--od-accent)"
              : "text-(--od-error)",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={clsx("my-1 h-px bg-(--od-border-subtle)", className)}
    />
  );
}

export function ContextMenuLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "px-2.5 py-1 text-[11px] font-medium text-(--od-text-tertiary)",
        className,
      )}
    >
      {children}
    </div>
  );
}
