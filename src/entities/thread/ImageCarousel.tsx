import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { LazyImage } from "@/shared/ui/LazyImage";

import { useImageViewerStore } from "@/shared/store/useImageViewerStore";
import { useCarouselGestures } from "@/shared/hooks/useCarouselGestures";

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
  autoPlayInterval?: number;
}

export function ImageCarousel({
  images,
  alt = "Image carousel",
  className = "",
  autoPlayInterval = 4000,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [manualInteractionVersion, setManualInteractionVersion] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const openViewer = useImageViewerStore((state) => state.open);

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToIndex = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };
  const gestures = useCarouselGestures({
    elementRef: carouselRef,
    itemCount: images.length,
    onPrevious: goToPrev,
    onNext: goToNext,
    onInteraction: () => setManualInteractionVersion((value) => value + 1),
  });

  // 自动轮播逻辑
  useEffect(() => {
    if (images.length <= 1 || isHovered) return;

    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [
    images.length,
    isHovered,
    autoPlayInterval,
    goToNext,
    manualInteractionVersion,
  ]);

  // 如果没有图片
  if (!images || images.length === 0) return null;

  // 单图模式，直接显示，不需要多余的按键和轮播
  if (images.length === 1) {
    return (
      <div
        className={`relative w-full overflow-hidden cursor-zoom-in ${className}`}
        onClick={() => openViewer(images[0], alt)}
      >
        <LazyImage src={images[0]} alt={alt} className="h-full w-full" />
      </div>
    );
  }

  // 多图轮播模式
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div
      ref={carouselRef}
      className={`group relative flex w-full touch-pan-y overflow-hidden bg-(--od-bg-tertiary) ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerEnter={gestures.onPointerEnter}
      onPointerLeave={gestures.onPointerLeave}
      onPointerDown={gestures.onPointerDown}
      onPointerUp={gestures.onPointerUp}
      onPointerCancel={gestures.onPointerCancel}
    >
      {/* 轮播图片层 */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0 h-full w-full"
        >
          <LazyImage
            src={images[currentIndex]}
            alt={`${alt} - ${currentIndex + 1}`}
            className="h-full w-full"
          />
        </motion.div>
      </AnimatePresence>

      {/* 左侧点击区（隐藏的导航按钮）- 占 1/4 */}
      <div
        className="absolute bottom-0 left-0 top-0 z-10 w-1/4 cursor-pointer"
        onClick={() => {
          if (gestures.shouldSuppressClick()) return;
          setManualInteractionVersion((value) => value + 1);
          goToPrev();
        }}
      />

      {/* 中间查看大图区 - 占 1/2 */}
      <div
        className="absolute bottom-0 left-1/4 z-10 h-full w-1/2 cursor-zoom-in"
        onClick={() => {
          if (gestures.shouldSuppressClick()) return;
          openViewer(images[currentIndex], alt);
        }}
      />

      {/* 右侧点击区 - 占 1/4 */}
      <div
        className="absolute bottom-0 right-0 top-0 z-10 w-1/4 cursor-pointer"
        onClick={() => {
          if (gestures.shouldSuppressClick()) return;
          setManualInteractionVersion((value) => value + 1);
          goToNext();
        }}
      />

      {/* 显式左右箭头指示器（仅在 Hover 时有少许透明度提示） */}
      <div className="absolute inset-y-0 left-2 z-20 flex items-center pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
          <ChevronLeft className="h-5 w-5" />
        </div>
      </div>
      <div className="absolute inset-y-0 right-2 z-20 flex items-center pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>

      {/* 底部小圆点 */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setManualInteractionVersion((value) => value + 1);
              goToIndex(idx);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-6 bg-(--od-accent)"
                : "w-2 bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
