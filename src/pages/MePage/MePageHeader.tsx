import type { ComponentType } from 'react';
import { UserHeaderCard } from '@/entities/user/UserHeaderCard';
import type { User } from '@/features/auth/api/authApi';

export interface MePageTabOption {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface MePageHeaderProps {
  currentTab: string;
  onOpenProfile: () => void;
  onSelectTab: (tab: string) => void;
  showProfileButton: boolean;
  tabOptions: MePageTabOption[];
  user?: User;
}

export function MePageHeader({
  currentTab,
  onOpenProfile,
  onSelectTab,
  showProfileButton,
  tabOptions,
  user,
}: MePageHeaderProps) {
  return (
    <section>
      <div className="flex flex-col gap-8">
        {showProfileButton && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onOpenProfile}
              className="od-inline-action od-inline-action-ghost w-full justify-center sm:w-auto"
            >
              查看作者页
            </button>
          </div>
        )}

        <UserHeaderCard user={user} />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {tabOptions.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectTab(item.key)}
                  data-tour={item.key === 'preferences' ? 'me-tab-preferences' : `me-tab-${item.key}`}
                  className={`od-pill-chip inline-flex items-center gap-1.5 text-xs transition-colors ${
                    active
                      ? 'bg-(--od-accent)/10 text-(--od-accent) font-od-bold'
                      : 'text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary) font-od-medium'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
