import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { withViewTransition } from '@/shared/lib/viewTransition';

import forumIcon from '@/assets/images/icon/A90C044F8DDF1959B2E9078CB629C239.png';
import { APP_VERSION } from '@/shared/config/appInfo';
import { parallaxScenes } from '@/shared/config/parallaxScenes';
import { useDeviceOrientationParallax } from '@/shared/hooks/useDeviceOrientationParallax';
import { WordLogoStatic } from '@/shared/ui/loaders/WordLogoStatic';

const GITHUB_REPO_URL = 'https://github.com/shiyue137mh-netizen/Odysseia-Forum-webpage';
const BACKEND_REPO_URL = 'https://github.com/starowo/Odysseia-Forum';
const ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const CONTRIBUTORS_URL = `${GITHUB_REPO_URL}/graphs/contributors`;
const FRONTEND_CONTRIBUTORS_API =
  'https://api.github.com/repos/shiyue137mh-netizen/Odysseia-Forum-webpage/contributors?per_page=100';
const BACKEND_CONTRIBUTORS_API =
  'https://api.github.com/repos/starowo/Odysseia-Forum/contributors?per_page=100';
const WIKI_URL = 'https://wiki.xn--35zx7g.org/';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function BugIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.53 4" /><path d="M18 13h4" /><path d="M21 21c0-2.1-1.8-3.8-3.8-4" />
    </svg>
  );
}

interface GithubContributor {
  id: number;
  login: string;
  html_url: string;
  avatar_url: string;
  contributions: number;
  type?: string;
}

export function AboutPage() {
  const navigate = useNavigate();
  const [scene] = useState(() => parallaxScenes[Math.floor(Math.random() * parallaxScenes.length)]!);
  const hasSpawnedRef = useRef(false);
  const backgroundLayerRef = useRef<HTMLImageElement>(null);
  const foregroundLayerRef = useRef<HTMLImageElement>(null);
  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const [isLeaving, setIsLeaving] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isSharpening, setIsSharpening] = useState(false);
  useDeviceOrientationParallax(parallaxTargetRef);

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
        foregroundLayerRef.current.style.transform = `translate3d(${(60 - currentX * 58).toFixed(2)}px, ${(28 - currentY * 46).toFixed(2)}px, 0) scale(1.1)`;
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

  // 苏醒序列动画：仅在进入背景模式时触发
  useEffect(() => {
    if (!isUiHidden) {
      setIsWakingUp(false);
      setIsSharpening(false);
      return;
    }

    // 模拟眨眼效果：闭-睁-闭-睁
    const sequence = async () => {
      setIsSharpening(true); // 先进入模糊
      setIsWakingUp(true);   // 闭眼

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
  }, [isUiHidden]);
  const [contributors, setContributors] = useState<GithubContributor[]>([]);
  const [contributorsError, setContributorsError] = useState(false);

  const handleSpawnNeko = () => {
    if (hasSpawnedRef.current) return;

    if (document.getElementById('oneko')) {
      hasSpawnedRef.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = '/oneko/oneko.js';
    script.async = true;
    script.dataset.cat = '/oneko/oneko.gif';
    document.body.appendChild(script);
    hasSpawnedRef.current = true;
  };

  const handleBack = () => {
    if (isLeaving) return;
    setIsLeaving(true);

    const goBack = () => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    };

    withViewTransition(goBack, 'wipe-down');
  };

  useEffect(() => {
    let isActive = true;

    const loadContributors = async () => {
      try {
        const fetchRepo = async (url: string) => {
          const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
          if (!res.ok) return [];
          return (await res.json()) as GithubContributor[];
        };

        const [frontendData, backendData] = await Promise.all([
          fetchRepo(FRONTEND_CONTRIBUTORS_API),
          fetchRepo(BACKEND_CONTRIBUTORS_API)
        ]);

        if (!isActive) return;

        // 合并并去重
        const merged = new Map<number, GithubContributor>();
        [...frontendData, ...backendData].forEach(c => {
          if (c.type === 'Bot' || c.login.toLowerCase().includes('bot')) return;
          if (merged.has(c.id)) {
            const existing = merged.get(c.id)!;
            existing.contributions += c.contributions;
          } else {
            merged.set(c.id, { ...c });
          }
        });

        const sorted = Array.from(merged.values()).sort((a, b) => b.contributions - a.contributions);

        if (sorted.length === 0 && (frontendData.length > 0 || backendData.length > 0)) {
           // 如果合并后为空但原始数据有，说明可能是 API 限制或其他问题，但不标记错误
        } else if (sorted.length === 0) {
           throw new Error('No contributors found');
        }

        setContributors(sorted);
        setContributorsError(false);
      } catch {
        if (!isActive) return;
        setContributorsError(true);
      }
    };

    void loadContributors();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden ${isUiHidden ? 'h-screen' : 'min-h-screen'}`}
    >
      {/* 苏醒遮罩：上眼睑 */}
      <div
        className={`fixed inset-x-0 top-0 z-[100] h-1/2 bg-[#010103] transition-transform duration-1000 ease-in-out ${
          isWakingUp ? 'translate-y-0' : '-translate-y-full'
        }`}
      />
      {/* 苏醒遮罩：下眼睑 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[100] h-1/2 bg-[#010103] transition-transform duration-1000 ease-in-out ${
          isWakingUp ? 'translate-y-0' : 'translate-y-full'
        }`}
      />

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
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'scale(1.08)', willChange: 'transform' }}
        />
        <img
          ref={foregroundLayerRef}
          src={scene.foreground}
          alt=""
          className={`pointer-events-none absolute inset-0 h-full w-full ${
            scene.foregroundFit === 'contain' ? 'object-contain object-right-bottom' : 'object-cover object-top'
          }`}
          style={{ transform: 'translate3d(40px, 50px, 0) scale(1.00)', transformOrigin: 'right bottom', willChange: 'transform' }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/14" />

      {/* 隐藏/显示 UI 悬浮按钮 */}
      <button
        type="button"
        onClick={() => setIsUiHidden((prev) => !prev)}
        className="absolute bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white"
        title={isUiHidden ? "显示界面" : "隐藏界面看背景"}
      >
        {isUiHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>

      {isUiHidden && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center animate-in fade-in zoom-in duration-500">
          <span className="rounded-full bg-black/30 px-4 py-1.5 text-sm text-white/70 backdrop-blur-md">
            点击背景任意处恢复界面
          </span>
        </div>
      )}

      <div
        className={`relative z-10 flex min-h-screen items-center justify-center px-4 py-8 md:px-8 transition-all duration-700 ${
          isUiHidden || isSharpening ? 'pointer-events-none translate-y-8 opacity-0 blur-sm' : 'translate-y-0 opacity-100 blur-0'
        }`}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="w-full">
            <div className="rounded-2xl border border-(--od-border-strong)/60 bg-[color-mix(in_oklab,var(--od-bg-secondary)_58%,transparent)] p-6 shadow-2xl backdrop-blur-lg md:p-7">
              <div className="mb-5 flex items-center justify-center md:justify-center">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLeaving}
                  className="inline-flex items-center gap-2 rounded-full border border-(--od-border) bg-[color-mix(in_oklab,var(--od-bg)_68%,transparent)] px-4 py-2 text-sm font-medium text-(--od-text-primary) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--od-accent)/45 hover:text-(--od-accent) disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>返回</span>
                </button>
              </div>

              <div
                className="mb-7 flex cursor-pointer select-none justify-center"
                onClick={handleSpawnNeko}
                title="试着点点我？"
              >
                <img
                  src={forumIcon}
                  alt="类脑ΟΔΥΣΣΕΙΑ"
                  className="h-20 w-20 rounded-2xl shadow-lg md:h-24 md:w-24"
                />
              </div>

              <div className="mb-5 flex flex-col items-center justify-center gap-2">
                <span className="text-2xl font-bold tracking-[0.2em] text-(--od-text-primary)">类脑</span>
                <WordLogoStatic className="h-4.5 text-(--od-text-primary)" />
              </div>

              <div className="mb-6">
                <p className="text-center text-base leading-relaxed text-(--od-text-primary) md:text-lg">
                  致力于对人工智能知识与技术的无尽探求，
                  <br />
                  踏上更为辉煌的征程。
                  <br />
                  <span className="mt-4 block italic text-(--od-text-secondary)">
                    玄想阑珊处，奇点自相生。
                  </span>
                </p>
              </div>

              <div className="mb-5 flex flex-wrap justify-center gap-3">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-(--od-accent) px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-(--od-accent-hover)"
                >
                  <GitHubIcon className="h-4 w-4" />
                  <span>前端仓库</span>
                </a>
                <a
                  href={BACKEND_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-(--od-border-strong)/55 bg-[color-mix(in_oklab,var(--od-bg)_72%,transparent)] px-5 py-2.5 text-sm font-medium text-(--od-text-primary) shadow-lg transition-all duration-200 hover:scale-105 hover:border-(--od-accent)/45 hover:text-(--od-accent)"
                >
                  <GitHubIcon className="h-4 w-4" />
                  <span>后端仓库</span>
                </a>
                <a
                  href={ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-(--od-error)/40 bg-[color-mix(in_oklab,var(--od-error)_5%,transparent)] px-5 py-2.5 text-sm font-medium text-(--od-text-primary) shadow-lg transition-all duration-200 hover:scale-105 hover:border-(--od-error)/60 hover:text-(--od-error)"
                >
                  <BugIcon className="h-4 w-4" />
                  <span>反馈 Bug</span>
                </a>
                <a
                  href={WIKI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-(--od-border-strong)/55 bg-[color-mix(in_oklab,var(--od-bg)_72%,transparent)] px-5 py-2.5 text-sm font-medium text-(--od-text-primary) shadow-lg transition-all duration-200 hover:scale-105 hover:border-(--od-accent)/45 hover:text-(--od-accent)"
                >
                  <span>智识库 Wiki</span>
                </a>
              </div>

              <div className="text-center">
                <p className="text-[13px] text-(--od-text-secondary)">
                  Web v{APP_VERSION} · Backend by Starowo
                </p>
                <p className="mt-1 text-xs text-(--od-text-tertiary)">致力于人工智能知识与技术的无尽探求</p>
              </div>

              <div className="mt-8 border-t border-(--od-border-strong)/18 pt-7 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--od-text-label)">
                  Contributors
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-(--od-text-primary)">
                  感谢一起建房子的宝宝们
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-(--od-text-secondary)">
                  没有大家一起递砖、补墙、修修小角落，就不会有现在的索引页。这里把每一位帮忙搭房子的宝宝都放出来。
                </p>

                <div className="mt-5 px-1">
                  {contributors.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                      {contributors.map((contributor) => (
                        <a
                          key={contributor.id}
                          href={contributor.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${contributor.login} · ${contributor.contributions} commits`}
                          className="group inline-flex flex-col items-center gap-1.5 text-center"
                        >
                          <img
                            src={`${contributor.avatar_url}&s=96`}
                            alt={contributor.login}
                            className="h-12 w-12 rounded-full border border-(--od-border-strong)/18 object-cover transition-transform duration-200 group-hover:scale-[1.04] sm:h-14 sm:w-14"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                          <span className="max-w-19 truncate text-[10px] text-(--od-text-primary)/88 transition-colors duration-200 group-hover:text-(--od-text-primary) sm:text-[11px]">
                            {contributor.login}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : contributorsError ? (
                    <a
                      href={CONTRIBUTORS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-sm text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary)"
                    >
                      这会儿没把头像名单拉下来，点我去 GitHub 看完整贡献榜呀。
                    </a>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="flex flex-col items-center gap-1.5">
                          <div className="h-12 w-12 animate-pulse rounded-full bg-(--od-bg-tertiary) sm:h-14 sm:w-14" />
                          <div className="h-2.5 w-12 animate-pulse rounded bg-(--od-bg-tertiary)" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 text-center">
                    <a
                      href={CONTRIBUTORS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-sm text-(--od-text-secondary) transition-colors hover:text-(--od-text-primary)"
                    >
                      去 GitHub 看完整贡献记录
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
