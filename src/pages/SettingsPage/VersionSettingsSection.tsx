import { Info } from 'lucide-react';

import { APP_VERSION } from '@/shared/config/appInfo';

import { SettingsPageSection } from './SettingsPageSection';

export function VersionSettingsSection() {
  return (
    <SettingsPageSection kicker="Build" title="版本" icon={Info}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--od-surface-input)_58%,transparent)] px-4 py-3">
        <p className="text-sm text-(--od-text-secondary)">当前前端版本</p>
        <span className="font-mono text-sm font-semibold text-(--od-text-emphasis)">{APP_VERSION}</span>
      </div>
    </SettingsPageSection>
  );
}
