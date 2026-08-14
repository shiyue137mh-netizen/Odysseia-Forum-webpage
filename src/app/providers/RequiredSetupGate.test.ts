import { describe, expect, it } from 'vitest';

import { shouldRequireSetup } from './RequiredSetupGate';

describe('shouldRequireSetup', () => {
  it('只拦截没有偏好且未完成旧引导的新用户', () => {
    expect(shouldRequireSetup(true, false)).toBe(true);
  });

  it('放行已经完成旧 initial_setup 的存量用户', () => {
    expect(shouldRequireSetup(true, true)).toBe(false);
  });

  it('放行已经存在偏好记录的用户', () => {
    expect(shouldRequireSetup(false, false)).toBe(false);
    expect(shouldRequireSetup(false, true)).toBe(false);
  });
});
