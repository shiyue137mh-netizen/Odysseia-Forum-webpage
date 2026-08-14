import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Booklist } from '@/entities/booklist/types';
import type { Thread } from '@/entities/thread/types';
import { booklistsApi } from '@/features/booklists/api/booklistsApi';
import { discoveryApi } from '@/features/discovery/api/discoveryApi';
import { searchApi } from '@/features/search/api/searchApi';
import {
  compactThread,
  compactTournament,
  createAISearchToolRuntime,
  findPendingAISearchQuestion,
  parseAISearchAskUserCall,
} from './tools';

vi.mock('@/features/booklists/api/booklistsApi', () => ({
  booklistsApi: { listPublic: vi.fn(), getDetail: vi.fn(), listItems: vi.fn() },
}));
vi.mock('@/features/search/api/searchApi', () => ({
  searchApi: { search: vi.fn(), getThread: vi.fn() },
}));
vi.mock('@/features/discovery/api/discoveryApi', () => ({
  discoveryApi: { getRandomThreads: vi.fn() },
}));

describe('AI 搜索工具结果', () => {
  beforeEach(() => vi.clearAllMocks());

  it('向模型保留作者 ID，便于继续按作者搜索', () => {
    const result = compactThread({
      thread_id: 'thread-1',
      channel_id: 'channel-1',
      title: '测试作品',
      author: {
        id: '123456789',
        name: 'author-name',
        global_name: null,
        display_name: '作者名',
        avatar_url: null,
      },
      created_at: '2026-08-03T00:00:00Z',
      reaction_count: 10,
      reply_count: 2,
      display_count: 20,
      collected_flag: false,
      thumbnail_urls: [],
      tags: [],
    } as Thread);

    expect(result.author).toBe('作者名');
    expect(result.author_id).toBe('123456789');
  });

  it('通过公开书单 API 的赛事标识搜索赛事', async () => {
    const tournament = {
      id: 12,
      title: '夏日创作赛',
      description: '公开征集作品',
      owner_id: '1',
      is_tournament: true,
      item_count: 8,
      collection_count: 3,
      view_count: 20,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-03T00:00:00Z',
    } as Booklist;
    vi.mocked(booklistsApi.listPublic).mockResolvedValue({ total: 1, limit: 8, offset: 0, results: [tournament] });
    const controller = new AbortController();
    const runtime = createAISearchToolRuntime(() => undefined, [], undefined, controller.signal);

    const result = JSON.parse(await runtime.execute({
      id: 'call-tournament',
      type: 'function',
      function: { name: 'search_tournaments', arguments: '{"keywords":"夏日","sort":"updated"}' },
    }));

    expect(booklistsApi.listPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: '夏日',
        sortMethod: 5,
        isTournament: true,
      }),
      controller.signal,
    );
    expect(result.results[0]).toEqual(compactTournament(tournament));
  });

  it('按显式 keyword_logic 将关键词转换为后端 AND 或 OR 语法', async () => {
    vi.mocked(searchApi.search).mockResolvedValue({ total: 0, results: [] } as any);
    const runtime = createAISearchToolRuntime(() => undefined);

    await runtime.execute({
      id: 'call-search',
      type: 'function',
      function: {
        name: 'search_threads',
        arguments: '{"keywords":"酒馆,前端/网页","keyword_logic":"or"}',
      },
    });

    expect(searchApi.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: '酒馆/前端/网页' }),
      undefined,
    );
  });

  it('校验 ask_user 并在工具结果出现前保持待回答状态', () => {
    const call = {
      id: 'call-question',
      type: 'function' as const,
      function: {
        name: 'ask_user',
        arguments: '{"question":"更偏向哪类作品？","options":["剧情","互动"]}',
      },
    };
    expect(parseAISearchAskUserCall(call)).toEqual({
      toolCallId: 'call-question',
      question: '更偏向哪类作品？',
      options: ['剧情', '互动'],
    });
    expect(findPendingAISearchQuestion([{ role: 'assistant', content: '', hidden: true, tool_calls: [call] }])).not.toBeNull();
    expect(findPendingAISearchQuestion([
      { role: 'assistant', content: '', hidden: true, tool_calls: [call] },
      { role: 'tool', content: '{"answer":"剧情"}', hidden: true, tool_call_id: 'call-question' },
    ])).toBeNull();
  });

  it('按用户偏好执行真实随机抽卡并记录生效配方', async () => {
    const thread = {
      thread_id: '12345678901234567',
      channel_id: '22345678901234567',
      title: '随机作品',
      author: null,
      created_at: '2026-08-03T00:00:00Z',
      reaction_count: 10,
      reply_count: 2,
      display_count: 20,
      collected_flag: false,
      thumbnail_urls: [],
      tags: ['剧情'],
    } as Thread;
    vi.mocked(discoveryApi.getRandomThreads).mockResolvedValue([thread]);
    const runtime = createAISearchToolRuntime(
      () => undefined,
      [],
      undefined,
      undefined,
      undefined,
      {
        channelIds: ['22345678901234567'],
        includeTags: ['剧情'],
        excludeTags: ['公告'],
      },
    );

    const result = JSON.parse(await runtime.execute({
      id: 'call-draw',
      type: 'function',
      function: { name: 'draw_threads', arguments: '{"count":1,"scope":"preferences","tag_logic":"and"}' },
    }));

    expect(discoveryApi.getRandomThreads).toHaveBeenCalledWith({
      limit: 1,
      channel_ids: ['22345678901234567'],
      include_tags: ['剧情'],
      exclude_tags: ['公告'],
      tag_logic: 'and',
    });
    expect(result.configuration).toContain('偏好卡池');
    expect(runtime.getDraws()).toEqual([{ configuration: result.configuration, threads: [thread] }]);
    expect(runtime.getThreads()).toContain(thread);
  });
});
