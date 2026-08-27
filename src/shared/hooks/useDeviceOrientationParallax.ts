import { useEffect } from "react";

interface ParallaxTargetRef {
  current: { x: number; y: number };
}

export function useDeviceOrientationParallax(
  targetRef: ParallaxTargetRef,
  onTargetChange?: () => void,
) {
  useEffect(() => {
    if (
      typeof DeviceOrientationEvent === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    let cancelled = false;
    let baselineBeta: number | null = null;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      baselineBeta ??= event.beta;
      targetRef.current = {
        x: Math.max(-1, Math.min(1, event.gamma / 30)),
        y: Math.max(-1, Math.min(1, (event.beta - baselineBeta) / 30)),
      };
      onTargetChange?.();
    };

    const orientationEvent =
      DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
    let isListening = false;
    const startListening = () => {
      if (cancelled || isListening) return;
      isListening = true;
      window.addEventListener("deviceorientation", handleOrientation);
    };

    const requestPermission = async () => {
      try {
        if (!cancelled && (await orientationEvent.requestPermission?.()) === "granted")
          startListening();
      } catch {
        // iOS 拒绝权限时保持静态背景即可。
      }
    };

    if (orientationEvent.requestPermission) {
      window.addEventListener("pointerdown", requestPermission, { once: true });
    } else {
      startListening();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", requestPermission);
      if (isListening)
        window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [onTargetChange, targetRef]);
}
