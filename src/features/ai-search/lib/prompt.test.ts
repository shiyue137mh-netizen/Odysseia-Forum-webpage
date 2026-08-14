import { describe, expect, it } from 'vitest';

import { buildAISearchSystemMessage } from './prompt';

describe('AI 搜索系统提示词', () => {
  it('在动态上下文后注入用户喜好并声明软约束边界', () => {
    const message = buildAISearchSystemMessage('保持简洁', '# 当前动态上下文\n频道资料', ' 喜欢温暖日常 ');

    expect(message.indexOf('# 当前动态上下文')).toBeLessThan(message.indexOf('# 用户喜好（仅作软参考）'));
    expect(message).toContain('喜欢温暖日常');
    expect(message).toContain('不要把用户喜好擅自转换为 include_tags');
    expect(message).toContain('$author:ID$ 必须映射到 search_threads.include_author_ids');
    expect(message).toContain('search_tournaments');
    expect(message).toContain('draw_threads');
    expect(message).toContain('随机结果不代表相关度排序');
    expect(message).toContain('get_resource_details');
    expect(message).toContain('ask_user');
    expect(message).toContain('你的 Markdown 回答也可以主动使用同一套 Token 模板');
    expect(message).toContain('$author:真实作者ID$');
    expect(message).toContain('首次向用户推荐、介绍或具体讨论某篇真实帖子时');
    expect(message).toContain('如果同一个 thread_id 已经通过 <thread> 展示过');
    expect(message).toContain('overview:');
    expect(message).toContain('不要把非剧情资源强行总结成剧情');
    expect(message).toContain('tone:');
    expect(message).toContain('不要输出 matches 或 caveat');
    expect(message).toContain('严禁输出 <thread thread_id="..." reason="..." />');
    expect(message).toContain('keyword_logic=or');
    expect(message).toContain('本轮精选了几篇');
    expect(message).toContain('<followups>');
    expect(message).toContain('direction: broader');
    expect(message).toContain('必须模拟用户继续对你提出要求');
    expect(message).toContain('禁止使用“你想不想”“要不要我”');
  });

  it('未设置用户喜好时不添加空段落', () => {
    expect(buildAISearchSystemMessage('保持简洁', '动态上下文', '   ')).not.toContain('# 用户喜好');
  });
});
