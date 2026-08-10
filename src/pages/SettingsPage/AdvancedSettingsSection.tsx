import { DangerousThemeUnlockButton } from '@/features/easter-eggs/components/DangerousThemeUnlockButton';

import { SettingsPageSection } from './SettingsPageSection';

type AdvancedSettingsSectionProps = {
  onResetSettings: () => void;
};

export function AdvancedSettingsSection({ onResetSettings }: AdvancedSettingsSectionProps) {
  return (
    <SettingsPageSection title="高级">
      <div className="space-y-3">
        <DangerousThemeUnlockButton />
        <button
          type="button"
          onClick={onResetSettings}
          className="w-full rounded-[1.1rem] bg-(--od-error) p-4 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--od-error)_85%,black)]"
        >
          <div className="text-sm font-medium text-white">重置设置</div>
          <div className="text-xs text-red-200">把所有设置恢复到最初的样子，确定要来一次大扫除吗？</div>
        </button>
      </div>
    </SettingsPageSection>
  );
}
