import { describe, expect, it } from 'vitest';

import { isSetupPreviewEnabled } from './RequiredSetupPage';

describe('isSetupPreviewEnabled', () => {
  it('只允许开发环境通过 preview=1 开启预览', () => {
    expect(isSetupPreviewEnabled('?preview=1', true)).toBe(true);
    expect(isSetupPreviewEnabled('?preview=1', false)).toBe(false);
  });

  it('不接受缺少参数或其他值', () => {
    expect(isSetupPreviewEnabled('', true)).toBe(false);
    expect(isSetupPreviewEnabled('?preview=0', true)).toBe(false);
  });
});
