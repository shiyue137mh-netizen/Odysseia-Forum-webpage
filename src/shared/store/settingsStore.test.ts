import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsStore } from './settingsStore';

describe('settingsStore 持久化', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('localStorage 保存失败时不提交内存状态', () => {
    const before = useSettingsStore.getState().settings;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    const saved = useSettingsStore.getState().updateSettings({ fontSize: 'large' });

    expect(saved).toBe(false);
    expect(useSettingsStore.getState().settings).toEqual(before);
  });
});
