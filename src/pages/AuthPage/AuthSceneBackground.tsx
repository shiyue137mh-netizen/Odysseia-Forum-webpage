import { useEffect, useRef, useState } from 'react';

import { parallaxScenes } from '@/shared/config/parallaxScenes';
import { useDeviceOrientationParallax } from '@/shared/hooks/useDeviceOrientationParallax';

export function AuthSceneBackground({ onClick }: { onClick?: () => void }) {
  const [scene] = useState(
    () => parallaxScenes[Math.floor(Math.random() * parallaxScenes.length)]!,
  );
  const backgroundLayerRef = useRef<HTMLImageElement>(null);
  const foregroundLayerRef = useRef<HTMLImageElement>(null);
  const parallaxTargetRef = useRef({ x: 0, y: 0 });
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
        foregroundLayerRef.current.style.transform = `translate3d(${(-currentX * 34).toFixed(2)}px, ${(-currentY * 26).toFixed(2)}px, 0) scale(1.06)`;
      }
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className="absolute inset-0 cursor-crosshair overflow-hidden"
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        parallaxTargetRef.current = {
          x: (event.clientX / window.innerWidth) * 2 - 1,
          y: (event.clientY / window.innerHeight) * 2 - 1,
        };
      }}
      onPointerLeave={() => {
        parallaxTargetRef.current = { x: 0, y: 0 };
      }}
      onClick={onClick}
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
  );
}
