import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnboardingTutorial } from './useOnboardingStore';
import { useOnboardingStore } from './useOnboardingStore';

const tutorial: OnboardingTutorial = {
  id: 'test',
  steps: [
    { id: 'first', title: '第一步', content: '' },
    { id: 'second', title: '第二步', content: '' },
  ],
};

describe('useOnboardingStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.setState({
      activeTutorial: null,
      stepIndex: 0,
      completedTutorialIds: [],
    });
  });

  it('支持前进和返回且不触发 View Transition', () => {
    const startViewTransition = vi.fn();
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });

    useOnboardingStore.getState().startTutorial(tutorial);
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().stepIndex).toBe(1);

    useOnboardingStore.getState().prevStep();
    expect(useOnboardingStore.getState().stepIndex).toBe(0);
    expect(startViewTransition).not.toHaveBeenCalled();
  });
});
