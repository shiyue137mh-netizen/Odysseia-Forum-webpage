export function ThreadCardSkeleton() {
  return (
    <article className="flex h-full w-full flex-col">
      <div className="flex flex-col gap-2 px-1 pb-3 pt-1 text-(--od-text-primary)">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-6 w-6 animate-pulse rounded-full bg-(--od-bg-tertiary) md:h-7 md:w-7" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-20 animate-shimmer rounded bg-linear-to-r from-(--od-bg-tertiary) via-(--od-border-strong) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
            <div className="mt-1 flex gap-2">
              <div className="h-2.5 w-14 animate-pulse rounded bg-(--od-bg-tertiary)" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-(--od-bg-tertiary)" />
            </div>
          </div>
        </div>

      </div>

      <div className="aspect-2/3 overflow-hidden rounded-t-[1.45rem] [mask-image:linear-gradient(to_bottom,black_0%,black_68%,transparent_96%,transparent_100%)]">
        <div className="h-full w-full animate-shimmer bg-linear-to-r from-(--od-bg-tertiary) via-(--od-bg-secondary) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
      </div>

      <div className="relative z-10 -mt-10 flex flex-1 flex-col gap-3 px-2">
        <div className="h-5 w-5/6 animate-shimmer rounded bg-linear-to-r from-(--od-bg-tertiary) via-(--od-border-strong) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
        <div className="min-h-11 space-y-2">
          <div className="h-3.5 w-full animate-shimmer rounded bg-linear-to-r from-(--od-bg-tertiary) via-(--od-border-strong) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
          <div className="h-3.5 w-11/12 animate-shimmer rounded bg-linear-to-r from-(--od-bg-tertiary) via-(--od-border-strong) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
        </div>

        <div className="min-h-11 content-start">
          <div className="flex flex-wrap gap-1.5">
          <div className="h-5 w-12 animate-shimmer rounded-md bg-linear-to-r from-(--od-bg-tertiary) via-(--od-border-strong) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
          <div className="h-5 w-16 animate-shimmer rounded-md bg-linear-to-r from-(--od-bg-tertiary) via-(--od-border-strong) to-(--od-bg-tertiary) bg-size-[200%_100%]" />
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2.5">
          <div className="h-3 w-8 animate-pulse rounded bg-(--od-bg-tertiary)" />
          <div className="h-3 w-8 animate-pulse rounded bg-(--od-bg-tertiary)" />
          <div className="h-3 w-8 animate-pulse rounded bg-(--od-bg-tertiary)" />
        </div>

      </div>
    </article>
  );
}
