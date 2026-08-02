import { describe, expect, it } from 'vitest';

import { parseModelIds } from './modelsApi';

describe('模型列表解析', () => {
  it('提取、去重并排序模型 ID', () => {
    expect(parseModelIds({ data: [{ id: 'z-model' }, { id: 'a-model' }, { id: 'z-model' }] })).toEqual([
      'a-model',
      'z-model',
    ]);
  });

  it('拒绝非 Chat Completions 兼容的响应', () => {
    expect(() => parseModelIds({ models: [] })).toThrow('不兼容');
  });
});
