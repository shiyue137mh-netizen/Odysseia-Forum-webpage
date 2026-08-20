import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { openDiscordWithFallback } from './openDiscordWithFallback';
import * as mascotToastModule from '@/features/mascot/lib/mascotToast';

describe('openDiscordWithFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('app 模式超时后触发 showMascotToast 提示', () => {
    const toastSpy = vi
      .spyOn(mascotToastModule, 'showMascotToast')
      .mockImplementation(() => 'toast-id' as unknown as string);

    openDiscordWithFallback({
      webUrl: 'https://discord.com/channels/1/2',
      appUrl: 'discord://-/channels/1/2',
      openMode: 'app',
      fallbackTimeoutMs: 1800,
    });

    vi.advanceTimersByTime(1800);

    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'discord-deeplink-fallback',
        emotion: 'confused',
        actionLabel: '用 Web 打开',
      }),
    );
  });
});
