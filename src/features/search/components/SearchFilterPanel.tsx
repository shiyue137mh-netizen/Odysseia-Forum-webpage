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
  onFilterTokenChange: (type: 'date' | 'likes' | 'replies', value: string | null) => void;
  onTagLogicChange: (value: TagLogic) => void;
  onToggleTagToken: (tagName: string, mode: 'include' | 'exclude') => void;
  preferenceExcludeTags: string[];
  preferenceIncludeTags: string[];
  tagLogic: TagLogic;
  timeFrom: string;
  timeTo: string;
  reactionMin: number | null;
  replyMin: number | null;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNaturalDateRange(period: 'today' | 'week' | 'month', now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === 'month') {
    start.setDate(1);
  }

  const end = new Date(start);
  if (period === 'today') end.setDate(end.getDate() + 1);
  if (period === 'week') end.setDate(end.getDate() + 7);
  if (period === 'month') end.setMonth(end.getMonth() + 1);

  return { from: formatLocalDate(start), to: formatLocalDate(end) };
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
  onFilterTokenChange,
  onTagLogicChange,
  onToggleTagToken,
  preferenceExcludeTags,
  preferenceIncludeTags,
  tagLogic,
  timeFrom,
  timeTo,
  reactionMin,
  replyMin,
}: SearchFilterPanelProps) {
  const hasPreferenceTags = preferenceIncludeTags.length + preferenceExcludeTags.length > 0;
  const dateTokenValue = (from: string, to: string) => from || to ? `${from}..${to}` : null;
  const selectedPeriod = (['today', 'week', 'month'] as const).find((period) => {
    const range = getNaturalDateRange(period);
    return range.from === timeFrom && range.to === timeTo;
  });
  const optionClass = (active: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'border-(--od-accent)/50 text-(--od-accent)'
      : 'border-white/8 text-(--od-text-secondary) hover:border-(--od-accent)/30 hover:text-(--od-accent)'
  }`;

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

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-(--od-text-tertiary)">发布时间</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {([
              ['today', '今天'],
              ['week', '本周'],
              ['month', '本月'],
            ] as const).map(([period, label]) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  const range = getNaturalDateRange(period);
                  onFilterTokenChange('date', selectedPeriod === period ? null : `${range.from}..${range.to}`);
                }}
                className={optionClass(selectedPeriod === period)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-(--od-text-tertiary)">
              起始日期
              <input
                id="topbar-timeFrom"
                type="date"
                value={timeFrom}
                onChange={(e) => onFilterTokenChange('date', dateTokenValue(e.target.value, timeTo))}
                className="od-chrome-surface mt-1 w-full rounded-xl border border-white/6 px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
              />
            </label>
            <label className="text-[11px] text-(--od-text-tertiary)">
              结束日期（不含）
              <input
                id="topbar-timeTo"
                type="date"
                value={timeTo}
                onChange={(e) => onFilterTokenChange('date', dateTokenValue(timeFrom, e.target.value))}
                className="od-chrome-surface mt-1 w-full rounded-xl border border-white/6 px-3 py-2 text-sm text-(--od-text-primary) outline-hidden transition-colors focus:border-(--od-accent)"
              />
            </label>
          </div>
        </div>

        {([
          ['likes', '点赞数', reactionMin, [100, 1000, 3000]],
          ['replies', '评论数', replyMin, [100, 1000, 10000]],
        ] as const).map(([type, label, current, values]) => (
          <div key={type} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wider text-(--od-text-tertiary)">{label}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onFilterTokenChange(type, null)} className={optionClass(current === null)}>不限</button>
              {values.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFilterTokenChange(type, `${value}+`)}
                  className={optionClass(current === value)}
                >
                  {value >= 10000 ? `${value / 10000}万+` : `${value}+`}
                </button>
              ))}
              <input
                key={`${type}-${current ?? 'unset'}`}
                type="number"
                min={0}
                max={9999999}
                step={1}
                inputMode="numeric"
                defaultValue={current !== null && !values.some((value) => value === current) ? current : ''}
                placeholder="自定义"
                aria-label={`自定义${label}下限`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                onBlur={(event) => {
                  const raw = event.currentTarget.value.trim();
                  if (!raw) {
                    if (current !== null) onFilterTokenChange(type, null);
                    return;
                  }
                  const value = Number(raw);
                  if (!Number.isSafeInteger(value) || value < 0 || value >= 10_000_000) {
                    event.currentTarget.value = current === null ? '' : String(current);
                    return;
                  }
                  onFilterTokenChange(type, `${value}+`);
                }}
                className="od-chrome-surface w-20 rounded-lg border border-white/8 px-2 py-1.5 text-xs text-(--od-text-primary) outline-hidden transition-colors placeholder:text-(--od-text-tertiary) focus:border-(--od-accent)"
              />
            </div>
          </div>
        ))}

        <div className="max-w-[260px]">
          <label htmlFor="topbar-tagLogic" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-(--od-text-tertiary)">标签逻辑</label>
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
