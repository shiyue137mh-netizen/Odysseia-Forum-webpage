import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { DiscordIcon } from '@/shared/ui/icons/DiscordIcon';
import { useAuth, useRefreshAuth } from '@/features/auth/hooks/useAuth';
import { apiClient } from '@/shared/api/client';
import forumIcon from '@/assets/images/icon/A90C044F8DDF1959B2E9078CB629C239.png';
import { showMascotToast } from '@/features/mascot/lib/mascotToast';
import { notifySuccess } from '@/shared/lib/notify';
import { WordLogoStatic } from '@/shared/ui/loaders/WordLogoStatic';
import ruleImage from '@/assets/images/background/rule.png';
import { parallaxScenes } from '@/shared/config/parallaxScenes';
import { useDeviceOrientationParallax } from '@/shared/hooks/useDeviceOrientationParallax';
import { WordLoader } from '@/shared/ui/loaders/WordLoader';
import { ImageViewer } from '@/shared/ui/ImageViewer';
import { useImageViewerStore } from '@/shared/store/useImageViewerStore';

export function LoginPage() {
  const navigate = useNavigate();
  const [scene] = useState(() => parallaxScenes[Math.floor(Math.random() * parallaxScenes.length)]!);
  const { isAuthenticated } = useAuth();
  const refreshAuth = useRefreshAuth();
  const openImageViewer = useImageViewerStore((state) => state.open);
  const backgroundLayerRef = useRef<HTMLImageElement>(null);
  const foregroundLayerRef = useRef<HTMLImageElement>(null);
  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [isSharpening, setIsSharpening] = useState(true);
  const [isLoginCardReady, setIsLoginCardReady] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  useDeviceOrientationParallax(parallaxTargetRef);

  const loadingWordStyle: CSSProperties & { '--od-text-primary': string } = {
    '--od-text-primary': 'color-mix(in oklab, var(--od-accent) 78%, white 22%)',
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => setIsLoginCardReady(true), 10_000);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frameId = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      currentX += (parallaxTargetRef.current.x - currentX) * 0.05;
      currentY += (parallaxTargetRef.current.y - currentY) * 0.05;

      if (backgroundLayerRef.current) {
        backgroundLayerRef.current.style.transform = `translate3d(${(-currentX * 12).toFixed(2)}px, ${(-currentY * 12).toFixed(2)}px, 0) scale(1.08)`;
      }
      if (foregroundLayerRef.current) {
        foregroundLayerRef.current.style.transform = `translate3d(${(-currentX * 34).toFixed(2)}px, ${(-currentY * 26).toFixed(2)}px, 0) scale(1.06)`;
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleParallaxMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    parallaxTargetRef.current = {
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: (event.clientY / window.innerHeight) * 2 - 1,
    };
  };

  // 苏醒序列动画：进入页面时自动触发
  useEffect(() => {
    const sequence = async () => {
      // 模拟眨眼效果：闭-睁-闭-睁
      await new Promise(r => setTimeout(r, 600));
      setIsWakingUp(false);  // 第一次睁眼
      await new Promise(r => setTimeout(r, 300));
      setIsWakingUp(true);   // 再次闭眼
      await new Promise(r => setTimeout(r, 500));
      setIsWakingUp(false);  // 最终睁眼

      // 睁眼后逐渐变清晰
      await new Promise(r => setTimeout(r, 400));
      setIsSharpening(false);
    };

    sequence();
  }, []);

  // 如果已经登录，自动跳转到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    if (!hasAcceptedRules) {
      showMascotToast({
        id: 'login-rules-required',
        emotion: 'confused',
        eyebrow: 'Rules Required',
        title: '还差一枚确认标记',
        message: '登录前需要先确认已经阅读并遵守社区规则。',
      });
      return;
    }

    setIsRedirecting(true);
    setIsWakingUp(true); // 闭眼

    // 在 Mock 模式下，这将由 msw 拦截
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_MOCK === 'true') {
      setTimeout(async () => {
        try {
          const response = await apiClient.post('/auth/login');
          if (response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
            notifySuccess('登录成功，欢迎回来', { id: 'login-mock-success' });
            refreshAuth();
            navigate('/', { replace: true });
          }
        } catch {
          showMascotToast({
            id: 'login-mock-error',
            emotion: 'error',
            eyebrow: 'Connection Failed',
            title: '登录入口没有接通',
            message: '刚才这次连接没成功。你可以立刻再试一次，我会继续盯着。',
            actionLabel: '重新登录',
            onAction: () => window.location.reload(),
            cancelLabel: '先停一下',
            onCancel: () => {
              setIsRedirecting(false);
              setIsWakingUp(false);
            },
            duration: 7000,
          });
          setIsRedirecting(false);
          setIsWakingUp(false);
        }
      }, 3000); // 留出更多时间感受闭眼和加载过程
      return;
    }

    // 真实环境：跳转到后端 OAuth 登录接口
    const loginPath = import.meta.env.DEV ? '/auth/login-dev' : '/auth/login';
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://forum.shimmerday.top';
    const finalUrl = `${backendUrl}/v1${loginPath}`;

    setTimeout(() => {
      window.location.href = finalUrl;
    }, 3000); // 留出 3s 给闭眼动画和后续加载感
  };

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden px-4">
      {/* 苏醒遮罩：上眼睑 (z-100) */}
      <div
        className={`fixed inset-x-0 top-0 z-[100] h-1/2 bg-[#010103] transition-transform duration-1000 ease-in-out ${
          isWakingUp ? 'translate-y-0' : '-translate-y-full'
        }`}
      />
      {/* 苏醒遮罩：下眼睑 (z-100) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[100] h-1/2 bg-[#010103] transition-transform duration-1000 ease-in-out ${
          isWakingUp ? 'translate-y-0' : 'translate-y-full'
        }`}
      />

      {/* 双层视差背景 */}
      <div
        className={`absolute inset-0 cursor-crosshair transition-[filter] duration-[3500ms] ease-out ${
          isSharpening ? 'blur-xl' : 'blur-0'
        }`}
        onPointerMove={handleParallaxMove}
        onPointerLeave={() => {
          parallaxTargetRef.current = { x: 0, y: 0 };
        }}
        onClick={() => {
          if (isUiHidden) setIsUiHidden(false);
        }}
      >
        <img
          ref={backgroundLayerRef}
          src={scene.background}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          style={{ transform: 'scale(1.08)', willChange: 'transform' }}
        />
        <img
          ref={foregroundLayerRef}
          src={scene.foreground}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          style={{ transform: 'scale(1.06)', willChange: 'transform' }}
        />
      </div>

      {/* 背景压暗层 (z-10) */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-10 bg-black/58 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {!isRedirecting && isLoginCardReady && (
        <button
          type="button"
          onClick={() => setIsUiHidden((current) => !current)}
          className="absolute bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white"
          title={isUiHidden ? '显示登录界面' : '隐藏界面看背景'}
        >
          {isUiHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}

      {isUiHidden && !isRedirecting && isLoginCardReady && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center animate-in fade-in zoom-in duration-500">
          <span className="rounded-full bg-black/30 px-4 py-1.5 text-sm text-white/70 backdrop-blur-md">
            点击背景任意处恢复登录界面
          </span>
        </div>
      )}

      <div
        className={`relative mx-auto flex w-full max-w-7xl transition-all duration-1000 ${
          isRedirecting ? 'z-[110] justify-center' : 'z-20 justify-center md:justify-start md:pl-[8%] lg:pl-[10%]'
        } ${
          !isRedirecting && (isWakingUp || isSharpening) ? 'opacity-0 translate-y-8 blur-sm' : 'opacity-100 translate-y-0 blur-0'
        }`}
      >

        <AnimatePresence mode="wait">
          {!isRedirecting && isLoginCardReady && !isUiHidden ? (
            <motion.div
              key="login-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full max-w-sm rounded-3xl bg-[color-mix(in_oklab,var(--od-bg-tertiary)_85%,transparent)] p-8 text-center shadow-2xl backdrop-blur-lg"
            >
              {/* Logo */}
              <div className="mb-8 flex justify-center">
                <img
                  src={forumIcon}
                  alt="类脑ΟΔΥΣΣΕΙΑ"
                  className="h-24 w-24 rounded-3xl shadow-2xl"
                />
              </div>

              {/* 标题 */}
              <div className="flex flex-col items-center justify-center mb-10 gap-2 max-w-full overflow-hidden">
                <span className="text-xl font-bold tracking-[0.2em] text-(--od-text-primary)">类脑</span>
                <WordLogoStatic className="h-5 shrink-0 text-(--od-text-primary) sm:h-6" />
              </div>

              <p className="mb-10 text-(--od-text-secondary)">使用 Discord 登录以继续</p>

              <label className="mb-5 flex items-start gap-3 rounded-2xl border border-(--od-border) bg-[color-mix(in_srgb,var(--od-bg-secondary)_64%,transparent)] px-4 py-3 text-left text-sm text-(--od-text-secondary)">
                <input
                  type="checkbox"
                  checked={hasAcceptedRules}
                  onChange={(e) => setHasAcceptedRules(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-(--od-accent)"
                />
                <span>
                  我已阅读并遵守
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      openImageViewer(ruleImage, '社区规则');
                    }}
                    className="mx-1 font-semibold text-(--od-link) underline-offset-4 hover:underline"
                  >
                    社区规则
                  </button>
                </span>
              </label>

              {/* 登录按钮 */}
              <button
                onClick={handleLogin}
                disabled={!hasAcceptedRules}
                className="w-full rounded-2xl bg-(--od-accent) px-8 py-5 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <DiscordIcon className="h-7 w-7" />
                  <span className="text-lg">
                    使用 Discord 登录
                  </span>
                </div>
              </button>

              {/* 说明文字 */}
              <p className="mt-8 text-sm text-(--od-text-tertiary)">
                我们仅读取你是否在服务器内且拥有"已验证"身份组
              </p>
            </motion.div>
          ) : isRedirecting ? (
            <motion.div
              key="loading-animation"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center"
              style={loadingWordStyle}
            >
              <div className="flex scale-100 items-center justify-center sm:scale-110 md:scale-125 drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                <WordLoader />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-12 animate-pulse text-base font-medium tracking-wider text-(--od-text-primary)"
              >
                欢迎来到类脑! 我们是非盈利性的AIRP社区
              </motion.p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <ImageViewer />
    </div>
  );
}
