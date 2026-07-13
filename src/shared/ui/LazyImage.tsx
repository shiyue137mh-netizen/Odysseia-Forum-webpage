import { useState, useEffect, useRef } from 'react';
import { useImageModeSetting } from '@/shared/hooks/useSettings';
import { reportBrokenThreadThumbnail, subscribeThreadThumbnailRepair } from '@/features/threads/lib/thumbnailRepairQueue';
import { optimizeDiscordImageUrl } from '@/shared/lib/imageOptimization';

interface LazyImageProps {
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
  onNaturalSize?: (width: number, height: number) => void;
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
  onNaturalSize,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLDivElement>(null);
  const imageMode = useImageModeSetting();
  const isImageDisabled = imageMode === 'off';

  useEffect(() => {
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
  }, []);

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 对 Discord 图片源应用高清优化（主打 WebP 无损转换）
    const optimized = optimizeDiscordImageUrl(src, 800);
    setCurrentSrc(optimized);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!isInView || isImageDisabled || isLoaded || !fallbackSrc || !loadTimeoutMs) return;
    if (currentSrc === fallbackSrc) return;

    const timer = window.setTimeout(() => {
      setCurrentSrc(fallbackSrc);
      setIsLoaded(false);
    }, loadTimeoutMs);

    return () => window.clearTimeout(timer);
  }, [currentSrc, fallbackSrc, isImageDisabled, isInView, isLoaded, loadTimeoutMs]);

  useEffect(() => {
    if (!threadId) return;
    return subscribeThreadThumbnailRepair(threadId, (urls) => {
      const targetUrl = urls[imageIndex];
      if (targetUrl) {
        setCurrentSrc(targetUrl);
      }
    });
  }, [threadId, imageIndex]);

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
                  setCurrentSrc(fallbackSrc);
                  setIsLoaded(false);
                  return;
                }
                if (!threadId) return;
                reportBrokenThreadThumbnail({ threadId, channelId });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
