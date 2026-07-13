import type { SearchToken } from '@/shared/lib/searchTokenizer';
import { Select } from '@/shared/ui/Select';

import { AuthorModePicker } from '@/features/search/components/AuthorModePicker';
import type { TagLogic } from '@/features/search/hooks/useSearchParams';

interface SearchFilterPanelProps {
  availableTags: string[];
  authorTokens: SearchToken[];
  hasPanelFilters: boolean;
  mergedExcludeTags: string[];
  mergedIncludeTags: string[];
  onClearFilters: () => void;
  onRemoveAuthorToken: (token: SearchToken) => void;
  onSelectAuthorToken: (authorId: string, mode: 'include' | 'exclude') => void;
  onTagLogicChange: (value: TagLogic) => void;
  onTimeFromChange: (value: string) => void;
  onTimeToChange: (value: string) => void;
  onToggleTagToken: (tagName: string, mode: 'include' | 'exclude') => void;
  preferenceExcludeTags: string[];
  preferenceIncludeTags: string[];
  tagLogic: TagLogic;
  timeFrom: string;
  timeTo: string;
}

export function SearchFilterPanel({
  availableTags,
  authorTokens,
  hasPanelFilters,
  mergedExcludeTags,
  mergedIncludeTags,
  onClearFilters,
  onRemoveAuthorToken,
  onSelectAuthorToken,
  onTagLogicChange,
  onTimeFromChange,
  onTimeToChange,
  onToggleTagToken,
  preferenceExcludeTags,
  preferenceIncludeTags,
  tagLogic,
  timeFrom,
  timeTo,
}: SearchFilterPanelProps) {
  const hasPreferenceTags = preferenceIncludeTags.length + preferenceExcludeTags.length > 0;

  return (
    <div data-tour="filter-panel" className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--od-text-primary)">高级筛选</h3>
        {hasPanelFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-(--od-accent) hover:underline"
          >
            清空筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="topbar-tagLogic" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-(--od-text-tertiary)">
            标签逻辑
          </label>
          <Select
            id="topbar-tagLogic"
            value={tagLogic}
            options={[
              { value: 'and', label: '全部包含 (AND)' },
              { value: 'or', label: '任一即可 (OR)' },
            ]}
            onChange={(v) => onTagLogicChange(v as TagLogic)}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="topbar-timeFrom" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-(--od-text-tertiary)">
            不早于
          </label>
          <input
            id="topbar-timeFrom"
            type="date"
            value={timeFrom}
            onChange={(e) => onTimeFromChange(e.target.value)}
            className="od-chrome-surface w-full rounded-xl border border-white/6 px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
          />
        </div>

        <div>
          <label htmlFor="topbar-timeTo" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-(--od-text-tertiary)">
            不晚于
          </label>
          <input
            id="topbar-timeTo"
            type="date"
            value={timeTo}
            onChange={(e) => onTimeToChange(e.target.value)}
            className="od-chrome-surface w-full rounded-xl border border-white/6 px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-(--od-text-tertiary)">
              标签筛选
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-(--od-text-tertiary) text-right">
                点击标签切换包含 / 排除 / 取消，不在这里显示删除按钮
              </span>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-(--od-text-tertiary)">
            <span>发现偏好标签</span>
            {hasPreferenceTags ? (
              <>
                {preferenceIncludeTags.map((tag) => (
                  <span key={`pref-include-${tag}`} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">+ {tag}</span>
                ))}
                {preferenceExcludeTags.map((tag) => (
                  <span key={`pref-exclude-${tag}`} className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-300">- {tag}</span>
                ))}
              </>
            ) : (
              <span>当前还没有保存偏好标签</span>
            )}
          </div>
          <div className="od-chrome-surface flex max-h-[180px] flex-wrap gap-2 overflow-y-auto rounded-2xl p-3">
            {availableTags.length > 0 ? (
              availableTags.map((tag) => {
                const isIncluded = mergedIncludeTags.includes(tag);
                const isExcluded = mergedExcludeTags.includes(tag);

                return (
                  <div key={tag} className="od-content-surface flex items-center rounded-full p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isIncluded) {
                          onToggleTagToken(tag, 'exclude');
                          return;
                        }
                        if (isExcluded) {
                          onToggleTagToken(tag, 'exclude');
                          return;
                        }
                        onToggleTagToken(tag, 'include');
                      }}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        isIncluded
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : isExcluded
                            ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                            : 'border-white/10 text-(--od-text-secondary) hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300'
                      }`}
                    >
                      {isIncluded ? '✓ ' : isExcluded ? '✕ ' : ''}{tag}
                    </button>
                  </div>
                );
              })
            ) : (
              <span className="text-sm text-(--od-text-tertiary)">当前上下文暂时没有可用标签</span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--od-text-tertiary)">
            作者筛选
          </p>
          <AuthorModePicker
            selected={authorTokens.map((token) => ({ id: token.value, mode: token.mode }))}
            onSelect={(author, mode) => onSelectAuthorToken(author.id, mode)}
            onRemove={(selection) => {
              const token = authorTokens.find(
                (item) => item.value === selection.id && item.mode === selection.mode,
              );
              if (token) onRemoveAuthorToken(token);
            }}
          />
        </div>
      </div>
    </div>
  );
}
