import { useCallback, useEffect, useRef } from "react";

interface UseCarouselGesturesOptions {
  elementRef: React.RefObject<HTMLElement | null>;
  itemCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onInteraction?: () => void;
  captureVerticalWheel?: boolean;
  verticalActivationDelayMs?: number;
  wheelThreshold?: number;
  wheelLockMs?: number;
  swipeThreshold?: number;
}

export function useCarouselGestures({
  elementRef,
  itemCount,
  onPrevious,
  onNext,
  onInteraction,
  captureVerticalWheel = false,
  verticalActivationDelayMs = 650,
  wheelThreshold = 40,
  wheelLockMs = 90,
  swipeThreshold = 42,
}: UseCarouselGesturesOptions) {
  const previousRef = useRef(onPrevious);
  const nextRef = useRef(onNext);
  const interactionRef = useRef(onInteraction);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const lastWheelDeltaRef = useRef(0);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const verticalActivationTimerRef = useRef<number | null>(null);
  const verticalWheelReadyRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);

  previousRef.current = onPrevious;
  nextRef.current = onNext;
  interactionRef.current = onInteraction;

  const clearVerticalActivation = useCallback(() => {
    if (verticalActivationTimerRef.current !== null) {
      window.clearTimeout(verticalActivationTimerRef.current);
      verticalActivationTimerRef.current = null;
    }
  }, []);

  const scheduleVerticalActivation = useCallback(() => {
    if (!captureVerticalWheel) return;
    clearVerticalActivation();
    verticalWheelReadyRef.current = false;
    verticalActivationTimerRef.current = window.setTimeout(() => {
      verticalWheelReadyRef.current = true;
      verticalActivationTimerRef.current = null;
    }, verticalActivationDelayMs);
  }, [
    captureVerticalWheel,
    clearVerticalActivation,
    verticalActivationDelayMs,
  ]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || itemCount <= 1) return;

    const handleWheel = (event: WheelEvent) => {
      const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!isHorizontal && !verticalWheelReadyRef.current) {
        scheduleVerticalActivation();
        return;
      }

      event.preventDefault();
      const scheduleWheelUnlock = () => {
        if (wheelUnlockTimerRef.current !== null) {
          window.clearTimeout(wheelUnlockTimerRef.current);
        }
        wheelUnlockTimerRef.current = window.setTimeout(() => {
          wheelLockedRef.current = false;
          wheelDeltaRef.current = 0;
          wheelUnlockTimerRef.current = null;
        }, wheelLockMs);
      };
      if (wheelLockedRef.current) {
        const delta = isHorizontal ? event.deltaX : event.deltaY;
        const previousDelta = lastWheelDeltaRef.current;
        const isDirectionChange =
          Math.abs(delta) >= 8 && Math.sign(delta) !== Math.sign(previousDelta);
        const isFreshImpulse =
          Math.abs(delta) >= 8 &&
          Math.abs(delta) > Math.max(1, Math.abs(previousDelta)) * 2.5;
        lastWheelDeltaRef.current = delta;
        scheduleWheelUnlock();
        if (!isDirectionChange && !isFreshImpulse) return;
        wheelLockedRef.current = false;
        wheelDeltaRef.current = delta;
      } else {
        const delta = isHorizontal ? event.deltaX : event.deltaY;
        lastWheelDeltaRef.current = delta;
        wheelDeltaRef.current += delta;
      }
      if (Math.abs(wheelDeltaRef.current) < wheelThreshold) return;

      const move =
        wheelDeltaRef.current > 0 ? nextRef.current : previousRef.current;
      wheelDeltaRef.current = 0;
      wheelLockedRef.current = true;
      interactionRef.current?.();
      move();
      scheduleWheelUnlock();
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [
    elementRef,
    itemCount,
    scheduleVerticalActivation,
    wheelLockMs,
    wheelThreshold,
  ]);

  useEffect(
    () => () => {
      clearVerticalActivation();
      if (wheelUnlockTimerRef.current !== null) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
    },
    [clearVerticalActivation],
  );

  return {
    onPointerEnter: scheduleVerticalActivation,
    onPointerLeave: () => {
      clearVerticalActivation();
      verticalWheelReadyRef.current = false;
      pointerStartRef.current = null;
    },
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") return;
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      swipeHandledRef.current = false;
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start || event.pointerType === "mouse") return;
      const distanceX = event.clientX - start.x;
      const distanceY = event.clientY - start.y;
      if (
        Math.abs(distanceX) < swipeThreshold ||
        Math.abs(distanceX) <= Math.abs(distanceY)
      ) {
        return;
      }
      swipeHandledRef.current = true;
      interactionRef.current?.();
      (distanceX < 0 ? nextRef.current : previousRef.current)();
      window.setTimeout(() => {
        swipeHandledRef.current = false;
      }, 0);
    },
    onPointerCancel: () => {
      pointerStartRef.current = null;
    },
    shouldSuppressClick: () => {
      if (!swipeHandledRef.current) return false;
      swipeHandledRef.current = false;
      return true;
    },
  };
}
