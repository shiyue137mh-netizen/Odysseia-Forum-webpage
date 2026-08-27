import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractAuthTokenFromHash,
  getStoredAuthToken,
  invalidateAuthSession,
  isUsingAuthHeader,
  setStoredAuthToken,
  setUseAuthHeader,
  subscribeAuthInvalidation,
} from './authSession';

describe('authSession 失效入口', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('原子清理凭据、Bearer 模式并通知认证缓存', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuthInvalidation(listener);
    setStoredAuthToken('token');
    setUseAuthHeader(true);

    invalidateAuthSession();

    expect(getStoredAuthToken()).toBeNull();
    expect(isUsingAuthHeader()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe('extractAuthTokenFromHash', () => {
  it('解析合法编码 token', () => {
    expect(extractAuthTokenFromHash('#token=abc%2B123')).toBe('abc+123');
  });

  it('畸形 percent-encoding 返回空值而不抛错', () => {
    expect(() => extractAuthTokenFromHash('#token=%E0%A4')).not.toThrow();
    expect(extractAuthTokenFromHash('#token=%E0%A4')).toBeNull();
    expect(extractAuthTokenFromHash('#token=%')).toBeNull();
  });
});
