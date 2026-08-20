import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  buildDiscordAppThreadUrl,
  buildDiscordThreadUrl,
  buildDiscordWebThreadUrl,
  openDiscordTarget,
} from './discord';

describe('discord link builders', () => {
  const options = {
    guildId: '1134557553011998840',
    channelId: '1134822069222264874',
    threadId: '1503799480804446349',
  };

  it('生成 Discord 网页端帖子链接', () => {
    expect(buildDiscordWebThreadUrl(options)).toBe(
      'https://discord.com/channels/1134557553011998840/1503799480804446349',
    );
  });

  it('生成 Discord App Deep Link', () => {
    expect(buildDiscordAppThreadUrl(options)).toBe(
      'discord://-/channels/1134557553011998840/1503799480804446349',
    );
  });

  it('根据打开方式选择链接格式', () => {
    expect(buildDiscordThreadUrl(options, 'web')).toBe(buildDiscordWebThreadUrl(options));
    expect(buildDiscordThreadUrl(options, 'app')).toBe(buildDiscordAppThreadUrl(options));
  });
});

describe('openDiscordTarget fallback mechanism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('web 模式下直接打开 window.open', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    openDiscordTarget({
      webUrl: 'https://discord.com/channels/1/2',
      appUrl: 'discord://-/channels/1/2',
      openMode: 'web',
    });
    expect(openSpy).toHaveBeenCalledWith(
      'https://discord.com/channels/1/2',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('app 模式下若 1.8s 未离开页面触发 onFallback 回调', () => {
    const fallbackSpy = vi.fn();
    openDiscordTarget({
      webUrl: 'https://discord.com/channels/1/2',
      appUrl: 'discord://-/channels/1/2',
      openMode: 'app',
      fallbackTimeoutMs: 1800,
      onFallback: fallbackSpy,
    });

    // 快进 1800ms
    vi.advanceTimersByTime(1800);

    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    expect(fallbackSpy).toHaveBeenCalledWith({
      webUrl: 'https://discord.com/channels/1/2',
    });
  });
});

