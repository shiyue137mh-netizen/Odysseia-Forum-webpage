import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { OnboardingBalloon } from './OnboardingBalloon';
import { 
  INITIAL_SETUP_TUTORIAL, 
  SETTINGS_GUIDE_TUTORIAL, 
  ME_GUIDE_TUTORIAL, 
  SEARCH_GUIDE_TUTORIAL,
  ADVANCED_SEARCH_GUIDE_TUTORIAL,
  AI_SEARCH_GUIDE_TUTORIAL,
} from '../lib/tutorials';

export function OnboardingManager() {
  const { 
    activeTutorial, 
    startTutorial, 
    isTutorialCompleted, 
  } = useOnboardingStore();
  const location = useLocation();

  // 页面级引导触发
  useEffect(() => {
    if (activeTutorial) return;

    // 1. 自动触发初始化引导
    if (!isTutorialCompleted('initial_setup')) {
      const timer = setTimeout(() => startTutorial(INITIAL_SETUP_TUTORIAL), 1500);
      return () => clearTimeout(timer);
    }

    // 2. 设置页引导
    if (location.pathname === '/settings' && !isTutorialCompleted('settings_guide')) {
      startTutorial(SETTINGS_GUIDE_TUTORIAL);
      return;
    }

    // 3. 个人中心引导 (MePage)
    if (location.pathname === '/me' && !isTutorialCompleted('me_guide')) {
      startTutorial(ME_GUIDE_TUTORIAL);
      return;
    }

    // 4. 搜索页引导
    if (location.pathname === '/search' && !isTutorialCompleted('search_guide')) {
      startTutorial(SEARCH_GUIDE_TUTORIAL);
      return;
    }

    // 5. 类脑娘搜索引导
    if (location.pathname === '/ai-search' && !isTutorialCompleted('ai_search_guide')) {
      startTutorial(AI_SEARCH_GUIDE_TUTORIAL);
    }
  }, [location.pathname, isTutorialCompleted, activeTutorial, startTutorial]);

  // 功能级引导触发（如高级筛选面板出现时）
  useEffect(() => {
    if (
      activeTutorial ||
      location.pathname !== '/search' ||
      isTutorialCompleted('advanced_search_guide')
    ) return;

    const startAdvancedGuide = () => {
      const filterPanel = document.querySelector('[data-tour="filter-panel"]');
      if (filterPanel) {
        startTutorial(ADVANCED_SEARCH_GUIDE_TUTORIAL);
      }
    };

    const handleFilterButtonClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-tour="search-filters-btn"]')) return;
      window.requestAnimationFrame(startAdvancedGuide);
    };

    document.addEventListener('click', handleFilterButtonClick);
    return () => document.removeEventListener('click', handleFilterButtonClick);
  }, [activeTutorial, isTutorialCompleted, location.pathname, startTutorial]);

  if (!activeTutorial) return null;

  return <OnboardingBalloon />;
}
