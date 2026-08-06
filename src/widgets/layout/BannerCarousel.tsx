import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { BannerApplicationModal } from '@/features/banner/components/BannerApplicationModal';
import { parallaxScenes } from '@/shared/config/parallaxScenes';
import { LazyImage } from '@/shared/ui/LazyImage';

const WIKI_URL = 'https://wiki.xn--35zx7g.org/';
const BANNER_LOAD_TIMEOUT_MS = 4500;
const bannerMediaClass = 'relative aspect-video min-h-[250px] overflow-hidden sm:min-h-0';

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
    id: 'fallback-space',
    image: parallaxScenes[0].background,
    foregroundImage: parallaxScenes[0].foreground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '从星海回望地球，也回来看一看大家创造的新世界。',
  },
  {
    id: 'fallback-vending-machine',
    image: parallaxScenes[1].background,
    foregroundImage: parallaxScenes[1].foreground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '靠着自动贩卖机休息片刻，再继续今天的社区巡游。',
  },
  {
    id: 'fallback-station',
    image: parallaxScenes[2].background,
    foregroundImage: parallaxScenes[2].foreground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '列车驶过站台，新的故事也正在抵达。',
  },
  {
    id: 'fallback-market',
    image: parallaxScenes[3].background,
    foregroundImage: parallaxScenes[3].foreground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '穿过阳光下的集市，继续寻找社区里的新作品。',
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

export function BannerCarousel({ banners, autoPlayInterval = 5000, onBannerClick, fullWidth = false }: BannerCarouselProps) {
  const backgroundLayerRef = useRef<HTMLDivElement>(null);
  const foregroundLayerRef = useRef<HTMLImageElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [fallbackBannerKey, setFallbackBannerKey] = useState<string | null>(null);
  const hasRealBanners = banners.length > 0;
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
    if (isHovered || displayBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isHovered, displayBanners.length, autoPlayInterval]);

  useEffect(() => {
    if (currentIndex < displayBanners.length) return;
    setCurrentIndex(0);
  }, [currentIndex, displayBanners.length]);

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  };

  const openApplyModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsApplyModalOpen(true);
  };

  const renderFooter = () => (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-(--od-border) px-4 py-3"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs text-(--od-text-secondary)">
        想推荐自己的帖子到展示位？提交 Banner 申请后等待审核即可。
      </p>
      <button
        type="button"
        onClick={openApplyModal}
        className="inline-flex items-center gap-2 rounded-full bg-(--od-accent) px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-(--od-accent-hover)"
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
  const foregroundImage = currentBanner.foregroundImage || (isUsingFallback ? fallbackScene.foreground : undefined);

  const resetBannerParallax = () => {
    if (backgroundLayerRef.current) backgroundLayerRef.current.style.transform = '';
    if (foregroundLayerRef.current) foregroundLayerRef.current.style.transform = '';
  };

  const handleBannerParallax = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !foregroundImage ||
      event.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 2 - 1;
    const y = (event.clientY - rect.top) / rect.height * 2 - 1;
    if (backgroundLayerRef.current) {
      backgroundLayerRef.current.style.transform = `translate3d(${(-x * 3).toFixed(2)}px, ${(-y * 3).toFixed(2)}px, 0) scale(1.03)`;
    }
    if (foregroundLayerRef.current) {
      foregroundLayerRef.current.style.transform = `translate3d(${(-x * 8).toFixed(2)}px, ${(-y * 6).toFixed(2)}px, 0) scale(1.04)`;
    }
  };

  return (
    <div
      className={`group relative overflow-hidden ${hasRealBanners ? 'cursor-pointer' : ''} ${fullWidth ? '' : 'mb-4 rounded-xl'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        resetBannerParallax();
      }}
      onClick={() => {
        if (hasRealBanners) onBannerClick?.(currentBanner);
      }}
    >
      {/* Banner 图片 */}
      <div className={bannerMediaClass} onPointerMove={handleBannerParallax}>
        <div
          ref={backgroundLayerRef}
          className={`absolute inset-0 transition-transform duration-300 ease-out ${foregroundImage ? 'scale-[1.03]' : ''}`}
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

        {foregroundImage && (
          <img
            ref={foregroundLayerRef}
            src={foregroundImage}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-contain object-right-bottom transition-transform duration-300 ease-out"
          />
        )}

        {/* 真实帖子封面保留可读性遮罩，站点视差封面直接展示原色。 */}
        {!foregroundImage && (
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
        )}

        {/* 内容 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
          <h2 className="mb-2 text-2xl font-bold text-white line-clamp-1">
            {currentBanner.title}
          </h2>
          <p className="text-sm text-gray-200 line-clamp-2">
            {currentBanner.description}
          </p>
        </div>
      </div>

      {/* 导航按钮 */}
      {displayBanners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="上一张"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="下一张"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* 指示器 */}
      {displayBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {displayBanners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${index === currentIndex
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}

      <div className="absolute right-4 top-4 z-10">
        <a
          href={WIKI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-xs font-semibold tracking-[0.12em] text-white backdrop-blur-md transition-colors hover:bg-black/55"
          onClick={(e) => e.stopPropagation()}
        >
          类脑智识库 Wiki
        </a>
      </div>

      {renderFooter()}

      <BannerApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
}
