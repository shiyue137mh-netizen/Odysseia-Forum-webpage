import { describe, expect, it, vi } from 'vitest';

import {
  configureImageRecovery,
  reportBrokenImage,
  subscribeImageRecovery,
} from '@/shared/lib/imageRecovery';

describe('图片恢复桥接', () => {
  it('把上报和订阅原样交给应用层注入的适配器', () => {
    const unsubscribe = vi.fn();
    const report = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const listener = vi.fn();
    configureImageRecovery({ report, subscribe });

    reportBrokenImage({ threadId: '101', channelId: '202' });
    const cleanup = subscribeImageRecovery('101', listener);

    expect(report).toHaveBeenCalledWith({ threadId: '101', channelId: '202' });
    expect(subscribe).toHaveBeenCalledWith('101', listener);
    expect(cleanup).toBe(unsubscribe);
  });
});
