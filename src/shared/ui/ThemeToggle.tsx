import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/shared/hooks/useTheme';

interface ThemeToggleProps {
  variant?: 'compact' | 'sidebar';
}

export function ThemeToggle({ variant = 'compact' }: ThemeToggleProps) {
  const { isDarkTheme, toggleTheme } = useTheme();

  const handleClick = () => {
    toggleTheme();
  };

  const nextLabel = isDarkTheme ? '切换到浅色模式' : '切换到深色模式';

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group flex w-full items-center gap-2 px-2 py-1.5 text-sm text-(--od-text-secondary) transition-colors duration-200 hover:text-(--od-text-primary)"
        aria-label={nextLabel}
        title={nextLabel}
      >
        <span className="h-1.5 w-1.5" aria-hidden="true" />
        <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
          <Sun
            className={`absolute h-4 w-4 transition-all duration-250 ${
              isDarkTheme
                ? 'scale-75 opacity-0 text-(--od-text-tertiary)'
                : 'scale-100 opacity-100 text-(--od-accent)'
            }`}
          />
          <Moon
            className={`absolute h-4 w-4 transition-all duration-250 ${
              isDarkTheme
                ? 'scale-100 opacity-100 text-(--od-accent)'
                : 'scale-75 opacity-0 text-(--od-text-tertiary)'
            }`}
          />
        </span>
        <span className="truncate">昼夜</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="group inline-flex items-center gap-1.5 text-(--od-text-tertiary) transition-colors duration-200 hover:text-(--od-text-primary)"
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <Sun
          className={`absolute h-4 w-4 transition-all duration-250 ${
            isDarkTheme
              ? 'scale-75 opacity-0 text-(--od-text-tertiary)'
              : 'scale-100 opacity-100 text-(--od-accent)'
          }`}
        />
        <Moon
          className={`absolute h-4 w-4 transition-all duration-250 ${
            isDarkTheme
              ? 'scale-100 opacity-100 text-(--od-accent)'
              : 'scale-75 opacity-0 text-(--od-text-tertiary)'
          }`}
        />
      </span>
      <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-current md:inline">
        {isDarkTheme ? 'Night' : 'Day'}
      </span>
    </button>
  );
}
