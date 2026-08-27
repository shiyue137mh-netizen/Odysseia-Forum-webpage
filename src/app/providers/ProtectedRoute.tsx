import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { buildCurrentAppRedirect, LOGIN_REDIRECT_STORAGE_KEY } from '@/shared/lib/navigationSafety';
import { OmicronLoader } from '@/shared/ui/loaders/OmicronLoader';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--od-bg)">
        <div className="text-center">
          <OmicronLoader className="mx-auto mb-4 h-12 w-12" />
          <p className="text-sm text-(--od-text-secondary)">验证登录状态...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, save redirect URL and navigate to login
  if (!isAuthenticated) {
    const currentPath = buildCurrentAppRedirect();
    sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, currentPath);
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // 已认证，显示内容
  return <Outlet />;
}
