import { useEffect } from "react";

export function useAdjacentImagePreload(urls: string[], activeIndex: number) {
  useEffect(() => {
    if (urls.length <= 1) return;

    const previousIndex = (activeIndex - 1 + urls.length) % urls.length;
    const nextIndex = (activeIndex + 1) % urls.length;
    const adjacentUrls = Array.from(
      new Set([urls[previousIndex], urls[nextIndex]].filter(Boolean)),
    );
    const images = adjacentUrls.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });

    return () => {
      for (const image of images) image.src = "";
    };
  }, [activeIndex, urls]);
}
