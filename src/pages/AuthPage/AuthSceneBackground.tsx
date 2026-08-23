import { useCallback, useRef, useState } from "react";

import { parallaxScenes } from "@/shared/config/parallaxScenes";
import { useSettledParallax } from "@/shared/hooks/useSettledParallax";

// 视差手调区：X/Y 是鼠标或陀螺仪移动到边缘时的最大位移（px）；
// scale 控制图层大小；baseXViewport 以屏幕宽度为单位平移，-0.4 即向左移动 40vw。
// 移动端使用 contain 保留完整人物，再用这两个参数把透明画布右侧的人物移到中央。
const AUTH_PARALLAX = {
  mobileBreakpoint: 640,
  background: {
    desktop: { x: 6, y: 6, scale: 1.05 },
    mobile: { x: 3, y: 3, scale: 1.03 },
  },
  foreground: {
    desktop: { x: 12, y: 10, scale: 1.02, baseXViewport: 0 },
    mobile: { x: 6, y: 5, scale: 3.5, baseXViewport: -0.4 },
  },
} as const;

export function AuthSceneBackground({ onClick }: { onClick?: () => void }) {
  const [scene] = useState(
    () => parallaxScenes[Math.floor(Math.random() * parallaxScenes.length)]!,
  );
  const backgroundLayerRef = useRef<HTMLImageElement>(null);
  const foregroundLayerRef = useRef<HTMLImageElement>(null);
  const initialBackground =
    window.innerWidth < AUTH_PARALLAX.mobileBreakpoint
      ? AUTH_PARALLAX.background.mobile
      : AUTH_PARALLAX.background.desktop;
  const initialForeground =
    window.innerWidth < AUTH_PARALLAX.mobileBreakpoint
      ? AUTH_PARALLAX.foreground.mobile
      : AUTH_PARALLAX.foreground.desktop;
  const setParallaxTarget = useSettledParallax(
    useCallback(({ x: currentX, y: currentY }) => {
      const isMobile = window.innerWidth < AUTH_PARALLAX.mobileBreakpoint;
      const background = isMobile
        ? AUTH_PARALLAX.background.mobile
        : AUTH_PARALLAX.background.desktop;
      const foreground = isMobile
        ? AUTH_PARALLAX.foreground.mobile
        : AUTH_PARALLAX.foreground.desktop;
      if (backgroundLayerRef.current) {
        backgroundLayerRef.current.style.transform = `translate3d(${(-currentX * background.x).toFixed(2)}px, ${(-currentY * background.y).toFixed(2)}px, 0) scale(${background.scale})`;
      }
      if (foregroundLayerRef.current) {
        const baseX = window.innerWidth * foreground.baseXViewport;
        foregroundLayerRef.current.style.transform = `translate3d(${(baseX - currentX * foreground.x).toFixed(2)}px, ${(-currentY * foreground.y).toFixed(2)}px, 0) scale(${foreground.scale})`;
      }
    }, []),
  );

  return (
    <div
      className="absolute inset-0 cursor-crosshair overflow-hidden"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        setParallaxTarget({
          x: (event.clientX / window.innerWidth) * 2 - 1,
          y: (event.clientY / window.innerHeight) * 2 - 1,
        });
      }}
      onPointerLeave={() => {
        setParallaxTarget({ x: 0, y: 0 });
      }}
      onClick={onClick}
    >
      <img
        ref={backgroundLayerRef}
        src={scene.background}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
        style={{
          transform: `scale(${initialBackground.scale})`,
          willChange: "transform",
        }}
      />
      <img
        ref={foregroundLayerRef}
        src={scene.foreground}
        alt=""
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          scene.foregroundFit === "contain"
            ? "object-contain object-center sm:object-right-bottom"
            : "object-contain object-center sm:object-cover sm:object-top"
        }`}
        style={{
          transform: `translate3d(${window.innerWidth * initialForeground.baseXViewport}px, 0, 0) scale(${initialForeground.scale})`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
