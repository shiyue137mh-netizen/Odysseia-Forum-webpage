import { Bell, Calendar, ExternalLink, Hash, ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ImageCarousel } from '@/entities/thread/ImageCarousel';
import type { StaticNotificationDefinition } from '@/features/notifications/notificationsConfig';
import { useThemeSettings } from '@/shared/hooks/useSettings';
import { formatAbsoluteDateTime } from '@/shared/lib/dateTime';
import { parseHttpUrl } from '@/shared/lib/urlSafety';
import { LazyImage } from '@/shared/ui/LazyImage';
import { MarkdownText } from '@/shared/ui/MarkdownText';

interface NotificationAnnouncementModalProps {
  notification: StaticNotificationDefinition;
  required?: boolean;
  onClose: () => void;
}

export function NotificationAnnouncementModal({
  notification,
  required = false,
  onClose,
}: NotificationAnnouncementModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { backgroundImageEnabled } = useThemeSettings();
  const [reachedEnd, setReachedEnd] = useState(false);
  const [minimumReadTimeElapsed, setMinimumReadTimeElapsed] = useState(!required);
  const content = notification.content;
  const tags = [...content.tags, ...content.virtual_tags.filter((tag) => !content.tags.includes(tag))];
  const externalUrl = notification.url ? parseHttpUrl(notification.url)?.toString() : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    const timer = required
      ? window.setTimeout(() => setMinimumReadTimeElapsed(true), 1200)
      : null;
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [required]);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const updateReachedEnd = () => {
      setReachedEnd(
        contentElement.scrollHeight - contentElement.scrollTop <= contentElement.clientHeight + 2,
      );
    };
    updateReachedEnd();
    const resizeObserver = new ResizeObserver(updateReachedEnd);
    resizeObserver.observe(contentElement);
    return () => resizeObserver.disconnect();
  }, [notification.id]);

  const canConfirm = !required || (reachedEnd && minimumReadTimeElapsed);

  return createPortal(
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!required) onClose();
      }}
      onClick={(event) => {
        if (!required && event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="notification-announcement-title"
      className={`${backgroundImageEnabled ? 'od-floating-glass' : 'od-floating-panel-solid'} fixed inset-0 z-2200 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden rounded-[1.5rem] border border-(--od-border-strong) p-0 text-(--od-text-primary) shadow-2xl shadow-black/50 backdrop:bg-black/65 backdrop:backdrop-blur-sm max-md:h-[calc(100dvh-1.5rem)]`}
    >
      <div className={`grid min-h-0 ${content.thumbnail_urls.length > 0 ? 'max-md:h-full max-md:grid-rows-[minmax(10rem,30dvh)_minmax(0,1fr)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]' : ''}`}>
        {content.thumbnail_urls.length > 0 && (
          <div className="relative min-h-44 overflow-hidden md:min-h-[24rem]">
            {content.thumbnail_urls.length === 1 ? (
              <LazyImage
                src={content.thumbnail_urls[0]}
                alt={content.title}
                className="absolute inset-0 h-full w-full [&_img]:object-contain"
              />
            ) : (
              <ImageCarousel
                images={content.thumbnail_urls}
                alt={content.title}
                className="absolute inset-0 h-full bg-transparent [&_img]:object-contain"
              />
            )}
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-col md:max-h-[min(42rem,calc(100dvh-2rem))]">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-(--od-shell-line) px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex min-w-0 items-center gap-3">
              {content.author.avatar_url ? (
                <img
                  src={content.author.avatar_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-(--od-border-strong)"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--od-bg-secondary)">
                  <Bell className="h-5 w-5 text-(--od-accent)" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-(--od-text-primary)">{content.author.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-(--od-text-tertiary)">
                  <Calendar className="h-3 w-3" />
                  {formatAbsoluteDateTime(notification.created_at)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {required && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/12 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  重要公告
                </span>
              )}
              {!required && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-(--od-text-tertiary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                  aria-label="关闭公告"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </header>

          <div
            ref={contentRef}
            onScroll={() => {
              const element = contentRef.current;
              if (element && element.scrollHeight - element.scrollTop <= element.clientHeight + 2) {
                setReachedEnd(true);
              }
            }}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--od-accent)">
              {notification.kind === 'release' ? 'Release Notes' : 'Community Notice'}
            </p>
            <h2
              id="notification-announcement-title"
              className="text-2xl font-extrabold leading-tight tracking-[-0.025em] [overflow-wrap:anywhere] sm:text-3xl"
            >
              {content.title}
            </h2>

            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="od-pill-chip cursor-default">
                    <Hash className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 min-w-0 text-sm leading-7 text-(--od-text-secondary) [overflow-wrap:anywhere] sm:text-base">
              <MarkdownText text={content.message} />
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-(--od-shell-line) px-5 py-4 sm:px-7">
            <p className="text-xs text-(--od-text-tertiary)">
              {required && !reachedEnd ? '阅读至底部后可以确认' : required && !minimumReadTimeElapsed ? '请稍候片刻' : ''}
            </p>
            <div className="flex items-center gap-3">
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--od-text-secondary) transition-colors hover:text-(--od-accent)"
                >
                  了解更多
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={!canConfirm}
                className="rounded-full bg-(--od-accent) px-5 py-2 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
              >
                {required ? notification.acknowledgement : '关闭'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
