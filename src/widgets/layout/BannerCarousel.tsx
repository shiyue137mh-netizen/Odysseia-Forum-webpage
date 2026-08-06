import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { BannerApplicationModal } from '@/features/banner/components/BannerApplicationModal';
import fantasyMarketBackground from '@/assets/images/background/apple.png';
import gardenBackground from '@/assets/images/background/garden.png';
import railwayBackground from '@/assets/images/background/railways.png';
import rainyDayBackground from '@/assets/images/background/rainyday.png';
import rooftopBackground from '@/assets/images/background/roof.png';
import spaceBackground from '@/assets/images/background/space.png';
import vendingMachineBackground from '@/assets/images/background/vending_machine.png';
import { LazyImage } from '@/shared/ui/LazyImage';

const WIKI_URL = 'https://wiki.xn--35zx7g.org/';
const BANNER_LOAD_TIMEOUT_MS = 4500;
const bannerMediaClass = 'relative aspect-video min-h-[250px] sm:min-h-0';

const fallbackBanners: Banner[] = [
  {
    id: 'fallback-fantasy-market',
    image: fantasyMarketBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '从西幻集市出发，继续往下逛逛最近的作品吧。',
  },
  {
    id: 'fallback-balcony-garden',
    image: gardenBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '在阳台花园停一会儿，新的帖子和书单正在下面等你。',
  },
  {
    id: 'fallback-railway',
    image: railwayBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '搭上电车，沿着索引继续探索社区里的新故事。',
  },
  {
    id: 'fallback-rainy-room',
    image: rainyDayBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '雨声适合慢慢阅读，也适合发现一张新的角色卡。',
  },
  {
    id: 'fallback-school-rooftop',
    image: rooftopBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '风从学校天台吹过，最近的社区内容仍在继续更新。',
  },
  {
    id: 'fallback-earth-from-space',
    image: spaceBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '从星海回望地球，也回来看一看大家创造的新世界。',
  },
  {
    id: 'fallback-vending-machine',
    image: vendingMachineBackground,
    title: '欢迎来到类脑Odysseia索引页',
    description: '靠着自动贩卖机休息片刻，再继续今天的社区巡游。',
  },
];

interface Banner {
  id: string;
  image: string;
  title: string;
  description: string;
  link?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number;
  onBannerClick?: (banner: Banner) => void;
  fullWidth?: boolean;
}

export function BannerCarousel({ banners, autoPlayInterval = 5000, onBannerClick, fullWidth = false }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const hasRealBanners = banners.length > 0;
  const displayBanners = hasRealBanners ? banners : fallbackBanners;

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
  const fallbackImage = fallbackBanners[currentIndex % fallbackBanners.length].image;

  return (
    <div
      className={`group relative overflow-hidden ${hasRealBanners ? 'cursor-pointer' : ''} ${fullWidth ? '' : 'mb-4 rounded-xl'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (hasRealBanners) onBannerClick?.(currentBanner);
      }}
    >
      {/* Banner 图片 */}
      <div className={bannerMediaClass}>
        <LazyImage
          src={currentBanner.image}
          alt={currentBanner.title}
          fallbackSrc={fallbackImage}
          loadTimeoutMs={BANNER_LOAD_TIMEOUT_MS}
          className="h-full w-full transition-transform duration-700"
        />

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

        {/* 内容 */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
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
