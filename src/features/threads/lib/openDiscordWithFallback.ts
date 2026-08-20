import { showMascotToast } from '@/features/mascot/lib/mascotToast';
import {
  openDiscordTarget,
  type OpenDiscordTargetOptions,
} from '@/shared/lib/discord';

export type OpenDiscordWithFallbackOptions = Omit<OpenDiscordTargetOptions, 'onFallback'> & {
  onFallback?: OpenDiscordTargetOptions['onFallback'];
};

/**
 * 带有类脑娘看板娘降级弹窗的 Discord 打开 helper：
 * - 尝试 DeepLink 唤起客户端；
 * - 若 1.5~2s 未离开页面/未失焦，自动弹出 Mascot Toast 引导降级到 Web 打开。
 */
export function openDiscordWithFallback(options: OpenDiscordWithFallbackOptions): void {
  openDiscordTarget({
    ...options,
    onFallback:
      options.onFallback ||
      (({ webUrl }) => {
        showMascotToast({
          id: 'discord-deeplink-fallback',
          emotion: 'confused',
          eyebrow: 'App Link Fallback',
          title: '换端似乎未响应',
          message: '你的设备似乎不支持这种方式。是否用 Web 打开？',
          actionLabel: '用 Web 打开',
          onAction: () => {
            window.open(webUrl, '_blank', 'noopener,noreferrer');
          },
          cancelLabel: '取消',
          duration: 8000,
        });
      }),
  });
}
