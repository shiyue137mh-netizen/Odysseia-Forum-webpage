import { useState, useRef, useEffect, useCallback, useId } from 'react';
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
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const generatedId = useId().replace(/:/g, '');
  const triggerId = id ?? `select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  const moveToOption = useCallback(
    (index: number) => {
      if (options.length === 0) return;
      const nextIndex = Math.max(0, Math.min(index, options.length - 1));
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    },
    [options.length],
  );

  const closeSelect = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openSelect = useCallback(
    (index = selectedIndex >= 0 ? selectedIndex : 0) => {
      setActiveIndex(Math.max(0, Math.min(index, Math.max(options.length - 1, 0))));
      setIsOpen(true);
    },
    [options.length, selectedIndex],
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

  // 打开后把焦点移入列表，键盘用户可以直接浏览选项。
  useEffect(() => {
    if (!isOpen || options.length === 0) return;
    const nextIndex = Math.max(0, Math.min(activeIndex, options.length - 1));
    optionRefs.current[nextIndex]?.focus();
  }, [activeIndex, isOpen, options.length]);

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
      closeSelect();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeSelect, isOpen]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSelect(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSelect, isOpen]);

  const isInline = variant === 'inline';

  const triggerClass = isInline
    ? 'flex min-h-10 items-center gap-1 bg-transparent text-sm text-(--od-text-primary) outline-hidden cursor-pointer'
    : 'od-ghost-input flex min-h-10 w-full items-center justify-between px-1 text-sm';

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.ul
          ref={panelRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ ...panelStyle, transformOrigin: 'top' }}
          className="od-floating-panel-solid fixed z-[9999] overflow-hidden rounded-xl py-1"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={isActive ? 0 : -1}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  switch (event.key) {
                    case 'ArrowDown':
                      event.preventDefault();
                      moveToOption((index + 1) % options.length);
                      break;
                    case 'ArrowUp':
                      event.preventDefault();
                      moveToOption((index - 1 + options.length) % options.length);
                      break;
                    case 'Home':
                      event.preventDefault();
                      moveToOption(0);
                      break;
                    case 'End':
                      event.preventDefault();
                      moveToOption(options.length - 1);
                      break;
                    case 'Enter':
                    case ' ':
                      event.preventDefault();
                      handleSelect(option.value);
                      break;
                    case 'Escape':
                      event.preventDefault();
                      closeSelect(true);
                      break;
                    case 'Tab':
                      closeSelect();
                      break;
                  }
                }}
                onClick={() => handleSelect(option.value)}
                className={`cursor-pointer whitespace-nowrap px-4 py-2.5 text-sm transition-colors duration-100 ${
                  isActive
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
          id={triggerId}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => !disabled && (isOpen ? closeSelect() : openSelect())}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Escape' && isOpen) {
              event.preventDefault();
              closeSelect(true);
              return;
            }
            if (isOpen) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              const index = event.key === 'ArrowDown' ? selectedIndex + 1
                : event.key === 'ArrowUp' ? selectedIndex - 1
                  : event.key === 'Home' ? 0
                    : event.key === 'End' ? options.length - 1
                      : selectedIndex;
              openSelect(index >= 0 ? index : 0);
            }
          }}
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
