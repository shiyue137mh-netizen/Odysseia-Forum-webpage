import { describe, expect, it } from 'vitest';

import { clearLoginErrorParams, normalizeLoginError } from './loginError';

describe('normalizeLoginError', () => {
  it('保留后端返回的具体原因并合并异常空白', () => {
    expect(normalizeLoginError('  Discord 身份组服务\n暂时不可用。  ')).toBe(
      'Discord 身份组服务 暂时不可用。',
    );
  });

  it('缺少或为空的错误原因不显示提示', () => {
    expect(normalizeLoginError(null)).toBeNull();
    expect(normalizeLoginError(' \n\t ')).toBeNull();
  });

  it('将超长内容限制为 240 字并保持 HTML 为普通文本', () => {
    const rawError = `<script>alert('x')</script>${'错'.repeat(300)}`;
    const normalized = normalizeLoginError(rawError);

    expect(normalized).toHaveLength(240);
    expect(normalized).toContain("<script>alert('x')</script>");
  });
});

describe('clearLoginErrorParams', () => {
  it('删除 error 和 status，同时保留其他登录参数', () => {
    const params = new URLSearchParams(
      'error=Discord%E6%9A%82%E6%97%B6%E4%B8%8D%E5%8F%AF%E7%94%A8&status=503&redirect=%2Fbooklists&preview=1',
    );

    const cleanedParams = clearLoginErrorParams(params);

    expect(cleanedParams.get('error')).toBeNull();
    expect(cleanedParams.get('status')).toBeNull();
    expect(cleanedParams.get('redirect')).toBe('/booklists');
    expect(cleanedParams.get('preview')).toBe('1');
    expect(params.get('error')).toBe('Discord暂时不可用');
  });
});
