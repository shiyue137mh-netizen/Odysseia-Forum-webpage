import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { BannerApplicationModal } from "@/features/banner/components/BannerApplicationModal";
import { parallaxScenes } from "@/shared/config/parallaxScenes";
import { LazyImage } from "@/shared/ui/LazyImage";
import { BannerFadeMedia } from "@/shared/ui/BannerFadeMedia";
import { useCarouselGestures } from "@/shared/hooks/useCarouselGestures";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";

const BANNER_LOAD_TIMEOUT_MS = 4500;
const bannerMediaClass =
  "relative aspect-video min-h-[250px] overflow-hidden sm:min-h-0";

interface Banner {
  id: string;
  image: string;
  foregroundImage?: string;
  title: string;
  description: string;
  link?: string;
}

const fallbackBanners: Banner[] = [
  {
    id: "fallback-space",
    image: parallaxScenes[0].background,
    foregroundImage: parallaxScenes[0].foreground,
    title: "欢迎来到类脑Odysseia索引页",
    description: "从星海回望地球，也回来看一看大家创造的新世界。",
  },
  {
    id: "fallback-vending-machine",
    image: parallaxScenes[1].background,
    foregroundImage: parallaxScenes[1].foreground,
    title: "欢迎来到类脑Odysseia索引页",
    description: "靠着自动贩卖机休息片刻，再继续今天的社区巡游。",
  },
  {
    id: "fallback-station",
    image: parallaxScenes[2].background,
    foregroundImage: parallaxScenes[2].foreground,
    title: "欢迎来到类脑Odysseia索引页",
    description: "列车驶过站台，新的故事也正在抵达。",
  },
  {
    id: "fallback-market",
    image: parallaxScenes[3].background,
    foregroundImage: parallaxScenes[3].foreground,
    title: "欢迎来到类脑Odysseia索引页",
    description: "穿过阳光下的集市，继续寻找社区里的新作品。",
  },
];

function getStableScene(id: string) {
  // ponytail: 用轻量字符串散列稳定分配默认封面；场景池需要权重时再升级为显式映射。
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return parallaxScenes[Math.abs(hash) % parallaxScenes.length]!;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number;
  onBannerClick?: (banner: Banner) => void;
  fullWidth?: boolean;
}

export function BannerCarousel({
  banners,
  autoPlayInterval = 5000,
  onBannerClick,
  fullWidth = false,
}: BannerCarouselProps) {
  const backgroundLayerRef = useRef<HTMLDivElement>(null);
  const foregroundLayerRef = useRef<HTMLImageElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [manualInteractionVersion, setManualInteractionVersion] = useState(0);
  const [fallbackBannerKey, setFallbackBannerKey] = useState<string | null>(
    null,
  );
  const hasRealBanners = banners.length > 0;
  const prefersReducedMotion = usePrefersReducedMotion();
  const displayBanners = hasRealBanners
    ? banners.map((banner) => {
        if (banner.image.trim()) return banner;
        const scene = getStableScene(banner.id);
        return {
          ...banner,
          image: scene.background,
          foregroundImage: scene.foreground,
        };
      })
    : fallbackBanners;

  useEffect(() => {
    if (isHovered || isFocusWithin || prefersReducedMotion || displayBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [
    isHovered,
    isFocusWithin,
    prefersReducedMotion,
    displayBanners.length,
    autoPlayInterval,
    manualInteractionVersion,
  ]);

  useEffect(() => {
    if (currentIndex < displayBanners.length) return;
    setCurrentIndex(0);
  }, [currentIndex, displayBanners.length]);

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(
      (prev) => (prev - 1 + displayBanners.length) % displayBanners.length,
    );
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  };
  const gestures = useCarouselGestures({
    elementRef: carouselRef,
    itemCount: displayBanners.length,
    onPrevious: goToPrevious,
    onNext: goToNext,
    onInteraction: () => setManualInteractionVersion((value) => value + 1),
  });

  const openApplyModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsApplyModalOpen(true);
  };

  const renderApplicationOverlay = () => (
    <div
      className="absolute inset-x-4 bottom-5 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:inset-x-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="min-w-0 truncate justify-self-start text-xs text-white/80">
        <span className="sm:hidden">想推荐自己的帖子？</span>
        <span className="hidden sm:inline">
          想推荐自己的帖子到展示位？提交 Banner 申请后等待审核即可。
        </span>
      </p>
      <div className="col-span-2 row-start-2 flex max-w-full justify-self-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {displayBanners.length > 1 &&
          displayBanners.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setManualInteractionVersion((value) => value + 1);
                setCurrentIndex(index);
              }}
              className={`h-2 shrink-0 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
      </div>
      <button
        type="button"
        onClick={openApplyModal}
        className="col-start-2 row-start-1 inline-flex shrink-0 items-center justify-self-end gap-2 text-xs font-semibold text-white transition-colors hover:text-(--od-accent) hover:underline sm:col-start-3"
      >
        <ImageIcon className="h-4 w-4" />
        申请 Banner
      </button>
    </div>
  );

  const currentBanner = displayBanners[currentIndex];
  const fallbackScene = getStableScene(currentBanner.id);
  const currentBannerKey = `${currentBanner.id}:${currentBanner.image}`;
  const isUsingFallback = fallbackBannerKey === currentBannerKey;
  const foregroundImage =
    currentBanner.foregroundImage ||
    (isUsingFallback ? fallbackScene.foreground : undefined);

  const resetBannerParallax = () => {
    if (backgroundLayerRef.current)
      backgroundLayerRef.current.style.transform = "";
    if (foregroundLayerRef.current)
      foregroundLayerRef.current.style.transform = "";
  };

  const handleBannerParallax = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !foregroundImage ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    if (backgroundLayerRef.current) {
      backgroundLayerRef.current.style.transform = `translate3d(${(-x * 3).toFixed(2)}px, ${(-y * 3).toFixed(2)}px, 0) scale(1.03)`;
    }
    if (foregroundLayerRef.current) {
      foregroundLayerRef.current.style.transform = `translate3d(${(-x * 8).toFixed(2)}px, ${(-y * 6).toFixed(2)}px, 0) scale(1.04)`;
    }
  };

  return (
    <div
      ref={carouselRef}
      className={`group relative touch-pan-y overflow-hidden ${hasRealBanners ? "cursor-pointer" : ""} ${fullWidth ? "" : "mb-4 rounded-xl"}`}
      onPointerEnter={gestures.onPointerEnter}
      onPointerLeave={gestures.onPointerLeave}
      onPointerDown={gestures.onPointerDown}
      onPointerUp={gestures.onPointerUp}
      onPointerCancel={gestures.onPointerCancel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        resetBannerParallax();
      }}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusWithin(false);
      }}
      onClick={() => {
        if (gestures.shouldSuppressClick()) return;
        if (hasRealBanners) onBannerClick?.(currentBanner);
      }}
    >
      {/* Banner 图片 */}
      <div className={bannerMediaClass} onPointerMove={handleBannerParallax}>
        <BannerFadeMedia>
          <div
            ref={backgroundLayerRef}
            className={`absolute inset-0 transition-transform duration-300 ease-out ${foregroundImage ? "scale-[1.03]" : ""}`}
          >
            <LazyImage
              src={currentBanner.image}
              alt={currentBanner.title}
              fallbackSrc={fallbackScene.background}
              loadTimeoutMs={BANNER_LOAD_TIMEOUT_MS}
              className="h-full w-full"
              onFallback={() => setFallbackBannerKey(currentBannerKey)}
            />
          </div>
        </BannerFadeMedia>

        {foregroundImage && (
          <BannerFadeMedia>
            <img
              ref={foregroundLayerRef}
              src={foregroundImage}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-contain object-right-bottom transition-transform duration-300 ease-out"
            />
          </BannerFadeMedia>
        )}

        {/* 真实帖子封面保留可读性遮罩，站点视差封面直接展示原色。 */}
        {!foregroundImage && (
          <BannerFadeMedia>
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
          </BannerFadeMedia>
        )}

        {/* 内容 */}
        <div className="absolute bottom-18 left-0 right-0 z-20 p-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] sm:bottom-16">
          <h2 className="mb-2 text-2xl font-bold text-white line-clamp-1">
            {currentBanner.title}
          </h2>
          <p className="text-sm text-gray-200 line-clamp-2">
            {currentBanner.description}
          </p>
        </div>

        {renderApplicationOverlay()}
      </div>

      {/* 导航按钮 */}
      {displayBanners.length > 1 && (
        <>
          <button
            onClick={(event) => {
              setManualInteractionVersion((value) => value + 1);
              goToPrevious(event);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="上一张"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(event) => {
              setManualInteractionVersion((value) => value + 1);
              goToNext(event);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="下一张"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <BannerApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
}
