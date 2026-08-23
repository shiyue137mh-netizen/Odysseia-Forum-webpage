import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import defaultIcon from '@/assets/images/icon/forum-icon-64.png';
import { MASCOT_IMAGES } from '@/features/mascot/assets';
import { useMascotStore } from '@/features/mascot/store/mascotStore';

import { DynamicFavicon } from './DynamicFavicon';

describe('DynamicFavicon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
    useMascotStore.setState({ emotion: 'hi', isVisible: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.head.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
  });

  it('看板娘隐藏后保留表情一段时间再恢复默认图标', () => {
    render(<DynamicFavicon />);

    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(defaultIcon);

    act(() => useMascotStore.setState({ emotion: 'success', isVisible: true }));
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(MASCOT_IMAGES.success);

    act(() => useMascotStore.setState({ isVisible: false }));
    act(() => vi.advanceTimersByTime(29_999));
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(MASCOT_IMAGES.success);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain(defaultIcon);
  });
});
