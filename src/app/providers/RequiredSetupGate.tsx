import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useOnboardingStore } from '@/features/onboarding/store/useOnboardingStore';
import { useUserPreferences } from '@/features/preferences/hooks/useUserPreferences';
import { GUILD_ID } from '@/shared/config/channelCategories.private';
import { OmicronLoader } from '@/shared/ui/loaders/OmicronLoader';

export function shouldRequireSetup(isFirstTime: boolean, legacySetupCompleted: boolean) {
  return isFirstTime && !legacySetupCompleted;
}

export function RequiredSetupGate() {
  const location = useLocation();
  const legacySetupCompleted = useOnboardingStore((state) =>
    state.completedTutorialIds.includes('initial_setup'),
  );
  const { isFirstTime, isLoading, isError, refetch } = useUserPreferences({ guildId: GUILD_ID });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--od-bg)">
        <OmicronLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--od-bg) px-4 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-sm leading-6 text-(--od-text-secondary)">
            暂时无法确认账号配置状态。为了避免误判成新用户，需要重新连接一次。
          </p>
          <button type="button" onClick={() => void refetch()} className="od-button-primary rounded-xl px-5 py-2 text-sm">
            重新检查
          </button>
        </div>
      </div>
    );
  }

  if (shouldRequireSetup(isFirstTime, legacySetupCompleted)) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/setup" replace state={{ returnTo }} />;
  }

  return <Outlet />;
}
