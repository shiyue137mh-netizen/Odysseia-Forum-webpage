import { useState, useEffect, useRef } from 'react';
import { useImageModeSetting } from '@/shared/hooks/useSettings';
import { optimizeDiscordImageUrl } from '@/shared/lib/imageOptimization';
import {
  reportBrokenImage,
  subscribeImageRecovery,
} from '@/shared/lib/imageRecovery';

// 会话内已完整显示过的图片 URL。路由切换会重建组件、重置 isLoaded，
// 浏览器 HTTP 缓存挡不住浮现动画重播；看过的图片重挂时凭这份记忆直出成品。
const sessionLoadedImages = new Set<string>();
const MAX_SESSION_LOADED_IMAGES = 500;

function rememberLoadedImage(src: string) {
  sessionLoadedImages.delete(src);
  sessionLoadedImages.add(src);
  if (sessionLoadedImages.size <= MAX_SESSION_LOADED_IMAGES) return;

  // ponytail: 会话级图片记忆只保留最近 500 条；若需跨页持久命中率，再升级为有界 LRU。
  const oldest = sessionLoadedImages.values().next().value;
  if (oldest) sessionLoadedImages.delete(oldest);
}

export interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholder?: string;
  fallbackSrc?: string;
  loadTimeoutMs?: number;
  threadId?: string;
  channelId?: string;
  index?: number; // Used for staggered animation delay
  imageIndex?: number; // Used to identify which picture in the sequence this is
  subscribeToRecovery?: boolean;
  onNaturalSize?: (width: number, height: number) => void;
  onFallback?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  fallbackSrc,
  loadTimeoutMs,
  threadId,
  channelId,
  index = 0,
  imageIndex = 0,
  subscribeToRecovery = true,
  onNaturalSize,
  onFallback,
  onError,
}: LazyImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => optimizeDiscordImageUrl(src, 800));
  const onFallbackRef = useRef(onFallback);
  // 会话内看过的图片直接以成品呈现：跳过懒加载门槛，不再播浮现动画
  const [isLoaded, setIsLoaded] = useState(() => sessionLoadedImages.has(currentSrc));
  const [isInView, setIsInView] = useState(isLoaded);
  const imgRef = useRef<HTMLDivElement>(null);
  const imageMode = useImageModeSetting();
  const isImageDisabled = imageMode === 'off';

  useEffect(() => {
    if (isImageDisabled || !threadId || !subscribeToRecovery) return;
    return subscribeImageRecovery(threadId, (urls) => {
      const targetUrl = urls[imageIndex];
      if (targetUrl) setCurrentSrc(targetUrl);
    });
  }, [imageIndex, isImageDisabled, subscribeToRecovery, threadId]);

  useEffect(() => {
    onFallbackRef.current = onFallback;
  }, [onFallback]);

  useEffect(() => {
    if (isImageDisabled || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '500px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [isImageDisabled, isInView]);

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 对 Discord 图片源应用高清优化（主打 WebP 无损转换）
    const optimized = optimizeDiscordImageUrl(src, 800);
    setCurrentSrc(optimized);
    setIsLoaded(sessionLoadedImages.has(optimized));
  }, [src]);

  useEffect(() => {
    if (!isInView || isImageDisabled || isLoaded || !fallbackSrc || !loadTimeoutMs) return;
    if (currentSrc === fallbackSrc) return;

    const timer = window.setTimeout(() => {
      onFallbackRef.current?.();
      setCurrentSrc(fallbackSrc);
      setIsLoaded(false);
    }, loadTimeoutMs);

    return () => window.clearTimeout(timer);
  }, [currentSrc, fallbackSrc, isImageDisabled, isInView, isLoaded, loadTimeoutMs]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {isImageDisabled ? (
        // 节省流量模式
        <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_oklab,var(--od-bg-tertiary)_85%,transparent)]">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-md border border-(--od-border-strong) bg-[color-mix(in_oklab,var(--od-bg-secondary)_85%,transparent)]" />
            <span className="text-[10px] text-(--od-text-tertiary)">图片已关闭</span>
          </div>
        </div>
      ) : (
        <>
          {/* 占位符 / 骨架屏 */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-(--od-surface-raised)">
              {placeholder ? (
                <img src={placeholder} alt="" className="h-full w-full object-cover opacity-50" />
              ) : (
                <div className="h-full w-full animate-pulse bg-linear-to-r from-(--od-surface-raised) via-(--od-interactive-hover) to-(--od-surface-raised) bg-size-[200%_100%]" />
              )}
            </div>
          )}

          {/* 实际图片 */}
          {isInView && (
            <img
              key={currentSrc}
              ref={imageRef}
              src={currentSrc}
              alt={alt}
              className={`h-full w-full object-cover transition-all duration-1000 ease-in-out ${isLoaded ? 'scale-100 opacity-100 blur-0' : 'scale-[1.01] opacity-0 blur-[2px]'
                }`}
              style={{
                transitionDelay: isLoaded ? `${(index % 24) * 60}ms` : '0ms',
              }}
              onLoad={() => {
                rememberLoadedImage(currentSrc);
                if (imageRef.current) {
                  onNaturalSize?.(
                    imageRef.current.naturalWidth,
                    imageRef.current.naturalHeight,
                  );
                }
                // 使用 decode() 确保图片不仅加载完，且已完成解码可以立即显示
                imageRef.current?.decode()
                  .then(() => setIsLoaded(true))
                  .catch(() => setIsLoaded(true)); // 回退
              }}
              onError={() => {
                if (fallbackSrc && currentSrc !== fallbackSrc) {
                  onFallbackRef.current?.();
                  setCurrentSrc(fallbackSrc);
                  setIsLoaded(false);
                  return;
                }
                if (threadId) {
                  reportBrokenImage({ threadId, channelId });
                }
                onError?.();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
