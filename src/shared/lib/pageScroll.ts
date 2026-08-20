const MAIN_SCROLL_CONTAINER_ID = 'main-scroll-container';

function getMainScrollContainer() {
  return document.getElementById(MAIN_SCROLL_CONTAINER_ID);
}

function getWindowScrollTop() {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  );
}

export function getPageScrollTop() {
  return Math.max(getMainScrollContainer()?.scrollTop || 0, getWindowScrollTop());
}

export function scrollPageToTop(behavior: ScrollBehavior = 'smooth') {
  const container = getMainScrollContainer();
  container?.scrollTo({ top: 0, behavior });
  window.scrollTo({ top: 0, behavior });
  document.documentElement.scrollTo?.({ top: 0, behavior });
  document.body.scrollTo?.({ top: 0, behavior });
}

export function setPageScrollTop(top: number) {
  const container = getMainScrollContainer();
  if (container) container.scrollTop = top;
  window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
}

export function addPageScrollListener(listener: () => void) {
  const container = getMainScrollContainer();
  const options = { passive: true } as const;

  container?.addEventListener('scroll', listener, options);
  window.addEventListener('scroll', listener, options);
  document.addEventListener('scroll', listener, options);

  return () => {
    container?.removeEventListener('scroll', listener);
    window.removeEventListener('scroll', listener);
    document.removeEventListener('scroll', listener);
  };
}

export function getPageScrollRoot() {
  return getMainScrollContainer() || document.scrollingElement || document.documentElement;
}
