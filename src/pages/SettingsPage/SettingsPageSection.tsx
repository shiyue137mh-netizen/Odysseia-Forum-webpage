import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type SettingsPageSectionProps = {
  kicker: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function SettingsPageSection({
  kicker,
  title,
  icon: Icon,
  children,
}: SettingsPageSectionProps) {
  return (
    <section className="od-setting-section border-t border-(--od-shell-line) pt-8 lg:pt-10">
      <div className="mb-6 flex items-start gap-4 lg:mb-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--od-surface-soft) text-(--od-accent)">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--od-text-tertiary)">
            {kicker}
          </p>
          <h2 className="od-section-title">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
