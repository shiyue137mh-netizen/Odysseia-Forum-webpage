import { Bell, Calendar, Hash, ShieldAlert } from "lucide-react";

import type { StaticNotificationDefinition } from "@/features/notifications/notificationsConfig";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";
import { LazyImage } from "@/shared/ui/LazyImage";

interface SystemDynamicNotificationCardProps {
  notification: StaticNotificationDefinition;
  unread: boolean;
  onOpen: () => void;
}

export function SystemDynamicNotificationCard({
  notification,
  unread,
  onOpen,
}: SystemDynamicNotificationCardProps) {
  const content = notification.content;
  const tags = Array.from(
    new Set([...content.tags, ...content.virtual_tags]),
  );
  const thumbnail = content.thumbnail_urls[0];

  return (
    <article className="border-b border-[color-mix(in_srgb,var(--od-text-secondary)_14%,transparent)] py-5 sm:px-3">
      <header className="mx-auto flex w-full max-w-4xl items-start gap-3">
        {content.author.avatar_url ? (
          <img
            src={content.author.avatar_url}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-12 sm:w-12"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--od-surface-content) sm:h-12 sm:w-12">
            <Bell className="h-5 w-5 text-(--od-accent)" />
          </span>
        )}

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-(--od-text-primary)">
              {content.author.name}
            </span>
            {unread && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--od-accent)"
                aria-label="未读"
              />
            )}
            {notification.presentation === "required" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/12 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                <ShieldAlert className="h-3 w-3" />
                重要公告
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-(--od-text-tertiary)">
            {formatRelativeDateTime(notification.created_at)} · 系统通知
          </p>
          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-(--od-text-secondary)">
            {notification.message}
          </p>
        </div>
      </header>

      <div className="relative mx-auto mt-4 w-full max-w-4xl sm:pl-[3.75rem]">
        <button
          type="button"
          onClick={onOpen}
          className="group flex w-full min-w-0 items-stretch gap-3 rounded-xl p-2 text-left transition-colors hover:bg-(--od-interactive-hover) focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent) sm:gap-5 sm:p-3"
          aria-label={`查看系统通知：${notification.title}`}
        >
          {thumbnail && (
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-(--od-surface-soft) sm:h-40 sm:w-52 sm:rounded-2xl">
              <LazyImage
                src={thumbnail}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}

          <div className="flex min-h-28 min-w-0 flex-1 flex-col sm:min-h-40">
            <h3 className="line-clamp-2 text-base font-bold leading-6 text-(--od-text-primary) sm:text-lg">
              {content.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-(--od-text-secondary)">
              {content.message}
            </p>

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-(--od-surface-raised)/70 px-2 py-0.5 text-[10px] text-(--od-text-secondary)"
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] text-(--od-text-tertiary)">
              <Calendar className="h-3.5 w-3.5" />
              {formatRelativeDateTime(notification.created_at)}
            </span>
          </div>
        </button>
      </div>
    </article>
  );
}
