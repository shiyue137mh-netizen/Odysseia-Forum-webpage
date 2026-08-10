import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  /** inline 变体：无背景无边框，适合嵌入已有容器 */
  variant?: 'default' | 'inline';
  'aria-label'?: string;
  disabled?: boolean;
}

/**
 * 遵循 Odysseia 设计规范的自定义 Select 下拉组件。
 * 使用 Portal 渲染下拉面板避免被父级 overflow 截断。
 */
export function Select({
  id,
  value,
  options,
  onChange,
  className = '',
  variant = 'default',
  'aria-label': ariaLabel,
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange],
  );

  // 计算下拉面板的位置，使其贴在触发按钮下方
  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: variant === 'inline' ? 'auto' : rect.width,
      minWidth: variant === 'inline' ? Math.max(rect.width, 128) : rect.width,
    });
  }, [variant]);

  useEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();

    // 滚动或 resize 时重新定位
    const reposition = () => updatePanelPosition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, updatePanelPosition]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isInline = variant === 'inline';

  const triggerClass = isInline
    ? 'flex min-h-10 items-center gap-1 bg-transparent text-sm text-(--od-text-primary) outline-hidden cursor-pointer'
    : 'od-ghost-input flex min-h-10 w-full items-center justify-between px-1 text-sm';

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.ul
          ref={panelRef}
          initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ ...panelStyle, transformOrigin: 'top' }}
          className="od-floating-panel-solid fixed z-[9999] overflow-hidden rounded-xl py-1"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`cursor-pointer whitespace-nowrap px-4 py-2.5 text-sm transition-colors duration-100 ${
                  isSelected
                    ? 'bg-(--od-accent)/12 font-medium text-(--od-accent)'
                    : 'text-(--od-text-primary) hover:bg-(--od-interactive-hover)'
                }`}
              >
                {option.label}
              </li>
            );
          })}
        </motion.ul>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`${triggerClass} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
        >
          <span className="truncate">{selectedLabel}</span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={`shrink-0 ${isInline ? 'ml-1' : 'ml-2'} text-(--od-text-tertiary)`}
          >
            <ChevronDown className={isInline ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </motion.span>
        </button>
      </div>
      {createPortal(panel, document.body)}
    </>
  );
}
