import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Calendar, Wand2, Dices } from "lucide-react";
import { OmicronIcon } from "@/shared/ui/icons/OmicronIcon";
import { OmicronLoader } from "@/shared/ui/loaders/OmicronLoader";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";

import type { Thread } from "@/entities/thread/types";
import { AuthorAvatar } from "@/entities/user/AuthorAvatar";
import { DiscordMarkdownText } from "@/shared/ui/DiscordMarkdownText";
import { optimizeDiscordImageUrl } from "@/shared/lib/imageOptimization";
import { formatRelativeDateTime } from "@/shared/lib/dateTime";

type DrawOverlayPhase = "charging" | "revealing" | "result" | "error";

interface DrawRevealOverlayProps {
  isOpen: boolean;
  phase: DrawOverlayPhase;
  results: Thread[];
  revealedCount: number;
  drawCount: number;
  isDrawing: boolean;
  error: string | null;
  onClose: () => void;
  onSkip: () => void;
  onRetry: () => void;
  onPreview: (thread: Thread) => void;
  onDrawAgain: (count: number) => void;
}

function CardImage({ src, layoutId, isActive }: { src: string; layoutId: string; isActive: boolean }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLowRes, setIsLowRes] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const hasImage = !!src && src.trim() !== "";
  
  // Use a stable source for the transition to avoid reloading flicker
  const [displaySrc, setDisplaySrc] = useState(hasImage ? optimizeDiscordImageUrl(src, 600) : "");
  
  useEffect(() => {
    if (!hasImage) {
      setIsLoaded(true);
      return;
    }
    const nextSrc = optimizeDiscordImageUrl(src, isActive ? 1600 : 600);
    // Only update if it's a major change or if we were not loaded
    if (!isLoaded || isActive) {
      setDisplaySrc(nextSrc);
    }
  }, [src, isActive, hasImage]);

  useEffect(() => {
    if (!hasImage) {
      setIsLoaded(true);
      return;
    }
    setIsLoaded(false);
    setIsLowRes(false);
  }, [src, hasImage]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-(--od-surface-raised)">
      {/* Fallback for no image */}
      {!hasImage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-[#1a1a1a] to-[#0a0a0a]">
          <OmicronIcon className="h-16 w-16 opacity-20" />
        </div>
      )}

      {/* Skeleton / Placeholder - only show if absolutely not loaded */}
      {hasImage && !isLoaded && (
        <div className="absolute inset-0 bg-linear-to-r from-(--od-surface-raised) via-(--od-interactive-hover) to-(--od-surface-raised) bg-size-[200%_100%] animate-pulse" />
      )}

      {hasImage && (
        <motion.img
          ref={imgRef}
          layoutId={layoutId}
          src={displaySrc}
          onLoad={() => {
            const img = imgRef.current;
            if (img) {
              if (isActive && img.naturalWidth < 1100 && img.naturalWidth > 0) {
                setIsLowRes(true);
              }
              img.decode()
                .then(() => setIsLoaded(true))
                .catch(() => setIsLoaded(true));
            }
          }}
          animate={{ 
            opacity: isLoaded ? 1 : 0,
            filter: isLowRes ? "blur(12px) brightness(0.7)" : "blur(0px) brightness(1)",
            scale: isLowRes ? 1.05 : 1
          }}
          transition={{ duration: 0.4 }}
          className="od-draw-card-image"
          style={{ perspective: 1000 }}
        />
      )}
    </div>
  );
}

export function DrawRevealOverlay({
  isOpen,
  phase,
  results,
  drawCount: _drawCount,
  error,
  onClose,
  onRetry,
  onPreview,
  onDrawAgain,
}: DrawRevealOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (phase === "revealing" || phase === "result") {
      setCurrentIndex(0);
    }
  }, [phase, results.length]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % results.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + results.length) % results.length);
  };

  const activeThread = results[currentIndex] || null;

  // Animation constants matching reference `sine.inOut` and timing
  const SINE_EASE = [0.445, 0.05, 0.55, 0.95] as any;

  return createPortal(
    <LayoutGroup>
      <AnimatePresence>
        <motion.div
          key="draw-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="od-draw-overlay"
          style={{ zIndex: 1500 }}
        >
          <div className="od-draw-overlay-panel">
            {/* Top Bar: Close + Draw Again */}
            <div className="absolute top-8 left-8 z-100 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
              >
                <X className="h-4 w-4" />
                关闭
              </button>
              {(phase === "revealing" || phase === "result") && (
                <>
                  <button
                    type="button"
                    onClick={() => onDrawAgain(1)}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    再来单抽
                  </button>
                  <button
                    type="button"
                    onClick={() => onDrawAgain(10)}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
                  >
                    <Dices className="h-3.5 w-3.5" />
                    十连发现
                  </button>
                </>
              )}
            </div>

            {phase === "charging" && (
              <div className="flex h-full w-full items-center justify-center bg-black">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex flex-col items-center gap-5 text-center"
                >
                  <OmicronLoader className="h-12 w-12 text-white/50" />
                  <p className="text-sm font-bold tracking-[0.4em] text-white uppercase">Loading Ritual...</p>
                </motion.div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-black px-8 text-center">
                <p className="text-lg font-bold text-white">这次抽卡没有成功</p>
                <p className="max-w-md text-sm text-white/70">
                  {error || "出了点小状况，稍后再试一次吧。"}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  再试一次
                </button>
              </div>
            )}

            {(phase === "revealing" || phase === "result") && (
              <div className="od-draw-stage">
                {/* Cards Stack */}
                {results.map((thread, index) => {
                  const isActive = index === currentIndex;
                  
                  // Calculate circular order for rail
                  let order = index - currentIndex;
                  if (order < 0) {
                    order += results.length;
                  }
                  
                  // Identify the "outgoing" card (the one that was just active)
                  const isOutgoing = order === results.length - 1;

                  // Responsive dimensions and positions for perfect expansion
                  const cardWidth = isActive || isOutgoing ? "100vw" : (isMobile ? "120px" : "220px");
                  const cardHeight = isActive || isOutgoing ? "100vh" : (isMobile ? "180px" : "330px");
                  const cardLeft = isActive || isOutgoing ? "0%" : (isMobile ? "24px" : `calc(50% + ${(order - 1) * 240}px)`);
                  const cardTop = isActive || isOutgoing ? "0%" : (isMobile ? "55%" : "55%");
                  const cardBottom = !isActive && !isOutgoing && isMobile ? "40px" : "auto";

                  return (
                    <motion.div
                      key={thread.thread_id}
                      layout
                      initial={false}
                      animate={{
                        width: cardWidth,
                        height: cardHeight,
                        left: cardLeft,
                        top: isMobile && !isActive && !isOutgoing ? "auto" : cardTop,
                        bottom: cardBottom,
                        y: "0%",
                        borderRadius: (isActive || isOutgoing) ? "0px" : "16px",
                        zIndex: isActive ? 10 : (isOutgoing ? 5 : 20 + (results.length - order)),
                        opacity: isOutgoing ? 0 : (order > 4 && !isActive ? 0 : 1),
                        scale: isOutgoing ? 1.5 : 1,
                        pointerEvents: (isActive || (order <= 4 && !isOutgoing)) ? 'auto' : 'none',
                      }}
                      transition={{ 
                        duration: 0.8, 
                        ease: SINE_EASE,
                        delay: isActive ? 0 : (order * 0.05) 
                      }}
                      className={`od-draw-card ${isActive ? 'isActive' : ''}`}
                      onClick={() => !isActive && setCurrentIndex(index)}
                    >
                      <CardImage 
                        src={thread.thumbnail_urls?.[0] || ""} 
                        layoutId={`img-${thread.thread_id}`}
                        isActive={isActive}
                      />
                      
                      {isActive && <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/20 to-transparent pointer-events-none" />}
                      
                      {!isActive && (
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/80 to-transparent">
                          <p className="text-[10px] font-bold text-(--od-accent) uppercase tracking-wider mb-1">
                            Discovery {index + 1}
                          </p>
                          <p className="text-white text-xs font-bold truncate">{thread.title}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Details Section */}
                <AnimatePresence mode="wait">
                  {activeThread && (
                    <div key={activeThread.thread_id} className="od-draw-details">
                      <div className="od-draw-details-kicker">
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: SINE_EASE, delay: 0.4 }}
                          className="text-(--od-accent) font-bold tracking-[0.3em] uppercase text-xs"
                        >
                          Discovery Card {currentIndex + 1} / {results.length}
                        </motion.p>
                      </div>

                      <div className="od-draw-details-title-box">
                        <motion.h2
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.0, ease: SINE_EASE, delay: 0.5 }}
                          className="od-draw-details-title"
                        >
                          {activeThread.title}
                        </motion.h2>
                      </div>

                      <div className="flex items-center gap-6 text-white/60 text-sm mt-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: 0.6, duration: 0.6 }}
                          className="flex items-center gap-2"
                        >
                          <AuthorAvatar author={activeThread.author} className="h-5 w-5" />
                          {activeThread.author?.display_name}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: 0.65, duration: 0.6 }}
                          className="flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          {formatRelativeDateTime(activeThread.created_at)}
                        </motion.div>
                      </div>

                      <div className="od-draw-details-desc-box">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: SINE_EASE, delay: 0.7 }}
                          className="od-draw-details-desc"
                        >
                          <DiscordMarkdownText text={activeThread.first_message_excerpt || ""} />
                        </motion.div>
                      </div>

                      <div className="od-draw-details-cta">
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: 0.85, duration: 0.6 }}
                          onClick={() => onPreview(activeThread)}
                          className="rounded-full bg-white px-8 py-3 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-(--od-accent) hover:text-white"
                        >
                          查看详情
                        </motion.button>
                        {phase === "result" && (
                          <>
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: 0.95, duration: 0.6 }}
                              onClick={() => onDrawAgain(1)}
                              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/10"
                            >
                              <Wand2 className="h-3.5 w-3.5" />
                              再来单抽
                            </motion.button>
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: 1.05, duration: 0.6 }}
                              onClick={() => onDrawAgain(10)}
                              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/10"
                            >
                              <Dices className="h-3.5 w-3.5" />
                              十连发现
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="od-draw-nav">
                  <button
                    onClick={handlePrev}
                    className="od-draw-nav-btn"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="od-draw-nav-btn"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>,
    document.body,
  );
}
