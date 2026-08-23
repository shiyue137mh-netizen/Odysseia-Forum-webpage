import { useCallback, useEffect, useRef } from "react";

import { useDeviceOrientationParallax } from "@/shared/hooks/useDeviceOrientationParallax";

interface ParallaxPoint {
  x: number;
  y: number;
}

const SETTLE_EPSILON = 0.001;

export function useSettledParallax(
  renderTransform: (current: ParallaxPoint) => void,
) {
  const targetRef = useRef<ParallaxPoint>({ x: 0, y: 0 });
  const currentRef = useRef<ParallaxPoint>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const renderTransformRef = useRef(renderTransform);
  renderTransformRef.current = renderTransform;

  const renderFrame = useCallback(() => {
    frameRef.current = null;
    if (document.visibilityState === "hidden") return;

    const current = currentRef.current;
    const target = targetRef.current;
    current.x += (target.x - current.x) * 0.05;
    current.y += (target.y - current.y) * 0.05;
    renderTransformRef.current(current);

    if (
      Math.abs(target.x - current.x) > SETTLE_EPSILON ||
      Math.abs(target.y - current.y) > SETTLE_EPSILON
    ) {
      frameRef.current = window.requestAnimationFrame(renderFrame);
    }
  }, []);

  const requestRender = useCallback(() => {
    if (
      frameRef.current !== null ||
      document.visibilityState === "hidden" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(renderFrame);
  }, [renderFrame]);

  useDeviceOrientationParallax(targetRef, requestRender);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        return;
      }
      requestRender();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [requestRender]);

  return useCallback(
    (target: ParallaxPoint) => {
      targetRef.current = target;
      requestRender();
    },
    [requestRender],
  );
}
