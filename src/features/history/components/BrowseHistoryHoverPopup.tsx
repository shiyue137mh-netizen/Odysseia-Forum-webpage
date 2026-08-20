import { Trash2, History, ArrowRight, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BrowseHistoryItem } from '@/shared/lib/browseHistory';
import { formatRelativeDateTime } from '@/shared/lib/dateTime';
import { useThemeSettings } from '@/shared/hooks/useSettings';
import { LazyImage } from '@/shared/ui/LazyImage';

interface BrowseHistoryHoverPopupProps {
  open: boolean;
  historyItems: BrowseHistoryItem[];
  onSelectThread: (threadId: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export function BrowseHistoryHoverPopup({
  open,
  historyItems,
  onSelectThread,
  onClearHistory,
  onClose,
}: BrowseHistoryHoverPopupProps) {
  const navigate = useNavigate();
  const { backgroundImageEnabled } = useThemeSettings();

  const recentItems = useMemo(() => historyItems.slice(0, 6), [historyItems]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="历史足迹快速预览"
      className={`${
        backgroundImageEnabled ? 'od-floating-glass' : 'od-floating-panel-solid'
      } fixed inset-x-3 top-20 z-50 mx-auto flex max-h-[75vh] w-auto max-w-sm flex-col items-stretch rounded-2xl border border-(--od-border-strong) shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[520px] sm:w-80`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部标题与清空 */}
      <div className="flex items-center justify-between border-b border-(--od-border) px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-(--od-accent)" />
          <h3 className="text-sm font-semibold text-(--od-text-primary)">浏览足迹</h3>
          <span className="text-xs text-(--od-text-tertiary)">({historyItems.length})</span>
        </div>
        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1 text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-error)"
            title="清空浏览历史"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>清空</span>
          </button>
        )}
      </div>

      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {recentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="mb-2 h-8 w-8 text-(--od-text-tertiary)/40" />
            <p className="text-xs text-(--od-text-tertiary)">暂无浏览足迹</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentItems.map((item) => (
              <button
                key={item.threadId}
                type="button"
                onClick={() => {
                  onSelectThread(item.threadId);
                  onClose();
                }}
                className="group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all duration-200 hover:bg-(--od-surface-hover)"
              >
                {item.thumbnailUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-(--od-border) bg-(--od-surface)">
                    <LazyImage
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--od-border) bg-(--od-surface-input) text-(--od-text-tertiary)">
                    <History className="h-4 w-4" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-medium text-(--od-text-primary) transition-colors group-hover:text-(--od-accent)">
                    {item.title}
                  </h4>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-(--od-text-tertiary)">
                    {item.authorName && (
                      <span className="truncate max-w-[90px]">{item.authorName}</span>
                    )}
                    <span>{formatRelativeDateTime(item.visitedAt)}</span>
                  </div>
                </div>

                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 text-(--od-text-tertiary)" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部查看全部 */}
      {historyItems.length > 0 && (
        <div className="border-t border-(--od-border) p-2">
          <button
            type="button"
            onClick={() => {
              navigate('/me?tab=history');
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-(--od-accent) transition-colors hover:bg-(--od-accent)/10"
          >
            <span>查看完整历史记录</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
