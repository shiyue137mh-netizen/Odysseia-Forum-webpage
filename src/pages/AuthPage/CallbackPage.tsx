import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '@/features/auth/api/authApi';
import { showMascotToast } from '@/features/mascot/lib/mascotToast';
import { extractErrorMessage, notifySuccess } from '@/shared/lib/notify';
import { LOGIN_REDIRECT_STORAGE_KEY, sanitizeInternalRedirect } from '@/shared/lib/navigationSafety';
import { OmicronLoader } from '@/shared/ui/loaders/OmicronLoader';

export function CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const confirmAuthAndRedirect = async () => {
      const error = searchParams.get('error');

      if (error) {
        showMascotToast({
          id: 'auth-callback-error',
          emotion: 'sad_apology',
          eyebrow: 'Login Interrupted',
          title: '这次登录没接上',
          message: 'Discord 登录流程中断了。先回到登录页，我陪你重新试一次。',
          actionLabel: '返回登录页',
          onAction: () => navigate('/login', { replace: true }),
          cancelLabel: '稍后再说',
          duration: 7000,
        });

        navigate('/login', { replace: true });
        return;
      }

      // Token is now extracted in App.tsx via hash
      // Just handle redirect restoration here
      const savedRedirect = sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY);
      const queryRedirect = searchParams.get('redirect');

      sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);

      const redirectPath = sanitizeInternalRedirect(savedRedirect || queryRedirect || '/');

      await new Promise((resolve) => setTimeout(resolve, 700));

      if (cancelled) return;

      let authState;
      try {
        authState = await queryClient.fetchQuery({
          queryKey: ['auth'],
          queryFn: authApi.checkAuth,
          staleTime: 0,
        });
      } catch (authError) {
        if (cancelled) return;
        showMascotToast({
          id: 'auth-callback-network-error',
          emotion: 'error',
          eyebrow: 'Connection Failed',
          title: '没能连接登录服务',
          message: extractErrorMessage(authError, '无法确认登录状态，请检查网络后重试。'),
          actionLabel: '返回登录页',
          onAction: () => navigate('/login', { replace: true }),
          duration: 8000,
        });
        navigate('/login', { replace: true });
        return;
      }

      if (cancelled) return;

      if (authState.loggedIn) {
        notifySuccess('登录成功，正在回到你刚刚的位置', { id: 'auth-callback-success' });
        navigate(redirectPath, { replace: true });
        return;
      }

      showMascotToast({
        id: 'auth-callback-session-missing',
        emotion: 'confused',
        eyebrow: 'Session Missing',
        title: '登录状态没有写入成功',
        message: 'Discord 已完成授权，但浏览器没有确认到论坛登录状态。请稍后重新登录一次。',
        actionLabel: '返回登录页',
        onAction: () => navigate('/login', { replace: true }),
        duration: 7000,
      });
      navigate('/login', { replace: true });
    };

    confirmAuthAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--od-bg)">
      <div className="text-center">
        <OmicronLoader className="mx-auto mb-4 h-12 w-12" />
        <p className="text-lg text-(--od-text-primary)">正在登录...</p>
        <p className="mt-2 text-sm text-(--od-text-secondary)">请稍候</p>
      </div>
    </div>
  );
}
