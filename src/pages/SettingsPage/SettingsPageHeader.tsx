import { Settings } from 'lucide-react';

import { FluidDivider } from '@/shared/ui/FluidDivider';

export function SettingsPageHeader() {
  return (
    <section>
      <FluidDivider label="Settings" tone="strong" className="mb-8 lg:mb-10" />
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--od-surface-soft) text-(--od-accent)">
          <Settings className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--od-text-tertiary)">
            Personal Workspace
          </p>
          <h1 className="od-section-title">设置</h1>
          <p className="max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
            调整阅读、布局和背景氛围。所有改动都会立即生效，并保存在当前浏览器里。
          </p>
        </div>
      </div>
    </section>
  );
}
