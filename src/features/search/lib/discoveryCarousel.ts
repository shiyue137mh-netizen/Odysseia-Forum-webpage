export function getWrappedCarouselIndex(
  currentIndex: number,
  direction: number,
  itemCount: number,
) {
  if (itemCount <= 0) return 0;
  return (currentIndex + direction + itemCount) % itemCount;
}
