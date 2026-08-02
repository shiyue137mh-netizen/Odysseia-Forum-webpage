export const DEFAULT_AI_SEARCH_SYSTEM_PROMPT =
  `你是类脑娘，类脑社区热心、真诚的看板娘。你喜欢角色卡、向日葵、暖洋洋的阳光，以及社区成员之间的善意。你轻快活泼、偶尔有点天然呆，也清楚自己很可爱。不要用括号或符号描述自己的动作、表情或内心活动。

你的当前任务是帮助用户搜索类脑索引中的作品。先理解用户真正想找的题材、角色、用途、风格、时间和热度要求，再使用搜索工具组合关键词、频道、Tag、时间和排序条件。搜索不够精确时，应尝试同义词、相关词或适当放宽条件；不要只搜索一次就轻率地说没有结果。

搜索工具返回的标题和短摘要只能用于初筛。只有候选作品的标题、Tag、摘要与用户需求基本相关，并且你进一步读取详情后确认核心内容确实符合需求，才算真正搜索到了。不要只因为标题里出现关键词就推荐，也不要编造没有通过工具获得的帖子。

最终回答要简洁、诚实：先说明找到了什么，再给出最值得查看的结果和具体推荐理由；存在不完全匹配时直接说明差异。如果结果不足，告诉用户你尝试过哪些条件，并提出一个最有帮助的追问。`;

const LEGACY_AI_SEARCH_SYSTEM_PROMPT =
  '你是秋青子，一位冷静温和的看板娘搜索助手。请用简洁的中文帮助用户寻找可能感兴趣的作品，不要过度夸张，优先给出明确结果和推荐理由。';

export const AI_SEARCH_SETTINGS_KEY = 'odysseia_ai_search_settings_v1';

export interface AISearchSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userTaste: string;
  sendClientHeader: boolean;
}

export const DEFAULT_AI_SEARCH_SETTINGS: AISearchSettings = {
  baseUrl: '',
  apiKey: '',
  model: '',
  systemPrompt: DEFAULT_AI_SEARCH_SYSTEM_PROMPT,
  userTaste: '',
  sendClientHeader: true,
};

export function loadAISearchSettings(): AISearchSettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SEARCH_SETTINGS;

  try {
    const value = JSON.parse(window.localStorage.getItem(AI_SEARCH_SETTINGS_KEY) || '{}');
    return {
      baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
      model: typeof value.model === 'string' ? value.model : '',
      systemPrompt:
        typeof value.systemPrompt === 'string' &&
        value.systemPrompt.trim() &&
        value.systemPrompt.trim() !== LEGACY_AI_SEARCH_SYSTEM_PROMPT
          ? value.systemPrompt.slice(0, 4000)
          : DEFAULT_AI_SEARCH_SYSTEM_PROMPT,
      userTaste: typeof value.userTaste === 'string' ? value.userTaste.slice(0, 2000) : '',
      sendClientHeader: value.sendClientHeader !== false,
    };
  } catch {
    return DEFAULT_AI_SEARCH_SETTINGS;
  }
}

export function saveAISearchSettings(settings: AISearchSettings) {
  window.localStorage.setItem(
    AI_SEARCH_SETTINGS_KEY,
    JSON.stringify({
      ...settings,
      baseUrl: settings.baseUrl.trim(),
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim(),
      systemPrompt: settings.systemPrompt.trim().slice(0, 4000),
      userTaste: settings.userTaste.trim().slice(0, 2000),
    }),
  );
}
