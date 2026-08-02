import { beforeEach, describe, expect, it } from 'vitest';

import {
  AI_SEARCH_SETTINGS_KEY,
  DEFAULT_AI_SEARCH_SYSTEM_PROMPT,
  loadAISearchSettings,
  saveAISearchSettings,
} from './settings';

describe('AI 搜索设置', () => {
  beforeEach(() => window.localStorage.clear());

  it('损坏或缺失的数据回退到默认提示词', () => {
    window.localStorage.setItem(AI_SEARCH_SETTINGS_KEY, '{');
    expect(loadAISearchSettings().systemPrompt).toBe(DEFAULT_AI_SEARCH_SYSTEM_PROMPT);
  });

  it('保存时裁剪配置并可恢复', () => {
    saveAISearchSettings({
      baseUrl: ' https://example.com/v1 ',
      apiKey: ' test-key ',
      model: ' test-model ',
      systemPrompt: ' 简短回答 ',
      userTaste: ' 喜欢细腻的角色关系 ',
      sendClientHeader: false,
    });

    expect(loadAISearchSettings()).toEqual({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
      systemPrompt: '简短回答',
      userTaste: '喜欢细腻的角色关系',
      sendClientHeader: false,
    });
  });

  it('将第一版占位提示词迁移为类脑娘搜索提示词', () => {
    window.localStorage.setItem(
      AI_SEARCH_SETTINGS_KEY,
      JSON.stringify({
        systemPrompt:
          '你是秋青子，一位冷静温和的看板娘搜索助手。请用简洁的中文帮助用户寻找可能感兴趣的作品，不要过度夸张，优先给出明确结果和推荐理由。',
      }),
    );

    expect(loadAISearchSettings().systemPrompt).toBe(DEFAULT_AI_SEARCH_SYSTEM_PROMPT);
    expect(loadAISearchSettings().userTaste).toBe('');
  });
});
