import defaultIcon from '@/assets/images/icon/A90C044F8DDF1959B2E9078CB629C239.png';
import { MASCOT_IMAGES } from '@/features/mascot/assets';
import { useMascotStore } from '@/features/mascot/store/mascotStore';
import { useEffect, useRef } from 'react';

const FAVICON_HOLD_MS = 30_000;

export function DynamicFavicon() {
  const emotion = useMascotStore((state) => state.emotion);
  const isVisible = useMascotStore((state) => state.isVisible);
  const hasShownMascotRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    favicon.type = 'image/png';
    if (isVisible) {
      hasShownMascotRef.current = true;
      favicon.href = MASCOT_IMAGES[emotion] || MASCOT_IMAGES.hi || defaultIcon;
      return;
    }

    if (!hasShownMascotRef.current) {
      favicon.href = defaultIcon;
      return;
    }

    resetTimerRef.current = window.setTimeout(() => {
      favicon.href = defaultIcon;
      resetTimerRef.current = null;
    }, FAVICON_HOLD_MS);

    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [emotion, isVisible]);

  return null;
}
