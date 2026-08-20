import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { AnimatedIcon } from '@/shared/ui/animation/AnimatedIcon';
import { addPageScrollListener, getPageScrollRoot, getPageScrollTop, scrollPageToTop } from '@/shared/lib/pageScroll';

interface ActivePageInfo {
  currentPage: number;
  totalPages: number;
}

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pageInfo, setPageInfo] = useState<ActivePageInfo | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const handlePageInfo = (e: Event) => {
      const customEvent = e as CustomEvent<ActivePageInfo | null>;
      setPageInfo(customEvent.detail || null);
    };

    window.addEventListener('odysseia:active-page-info', handlePageInfo);
    return () => {
      window.removeEventListener('odysseia:active-page-info', handlePageInfo);
    };
  }, []);

  useEffect(() => {
    const toggleVisibility = () => {
      // 滚动超过 300px 时显示按钮
      if (getPageScrollTop() > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    toggleVisibility();
    return addPageScrollListener(toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const container = getPageScrollRoot();
    if (!container) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    scrollPageToTop('smooth');

    // 寻找主内容区内的第一个可交互元素，转移焦点
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    setTimeout(() => {
      const firstFocusable = container.querySelector(focusableSelectors) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      } else if (container instanceof HTMLElement) {
        // 如果主内容区是空的，把焦点交给 main 容器本身
        container.focus();
      }
    }, 300);
  };

  if (!portalRoot) return null;

  const showPageBadge = Boolean(pageInfo && pageInfo.totalPages > 1);

  return createPortal(
    <button
      tabIndex={isVisible ? 0 : -1}
      onClick={scrollToTop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-20 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-(--od-accent) p-2 text-white shadow-lg shadow-(--od-accent)/30 transition-all duration-300 hover:scale-110 hover:bg-(--od-accent-hover) hover:shadow-xl active:scale-95 lg:bottom-8 ${
        isVisible
          ? 'pointer-events-auto opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 translate-y-4'
      }`}
      aria-label={showPageBadge ? `第 ${pageInfo?.currentPage} 页，共 ${pageInfo?.totalPages} 页 · 点击回到顶部` : '回到顶部'}
      title={showPageBadge ? `第 ${pageInfo?.currentPage} / ${pageInfo?.totalPages} 页 · 回到顶部` : '回到顶部'}
    >
      {showPageBadge && pageInfo && !isHovered && !isAnimating ? (
        <div className="flex items-baseline justify-center tracking-tight select-none leading-none">
          <span className="text-xs font-black text-white">{pageInfo.currentPage}</span>
          <span className="mx-0.5 text-[10px] font-light text-white/55">/</span>
          <span className="text-[10px] font-bold text-white/75">{pageInfo.totalPages}</span>
        </div>
      ) : (
        <AnimatedIcon
          icon={ArrowUp}
          className="h-5 w-5"
          animation={isAnimating ? 'flyUp' : 'bounce'}
          trigger={isAnimating ? 'none' : 'hover'}
          isActive={isAnimating}
        />
      )}
    </button>,
    portalRoot,
  );
}
