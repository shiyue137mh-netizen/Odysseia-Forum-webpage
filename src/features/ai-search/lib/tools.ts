import { z } from 'zod';

import type { Thread } from '@/entities/thread/types';
import type { Booklist } from '@/entities/booklist/types';
import type { AISearchDisplayMessage, AISearchToolTraceItem } from '@/features/ai-search/lib/session';
import { booklistsApi } from '@/features/booklists/api/booklistsApi';
import { searchApi, type SearchUIRequest } from '@/features/search/api/searchApi';
import { parseDateRangeToken } from '@/shared/lib/searchTokenizer';

export type AISearchStatus = 'thinking' | 'searching' | 'reading' | 'complete' | 'error';

export interface AISearchToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AISearchPendingQuestion {
  toolCallId: string;
  question: string;
  options: string[];
}

export const AI_SEARCH_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_threads',
      description:
        '使用类脑现有的传统索引搜索候选帖子。每次最多返回12条标题、Tag、统计和200字以内首楼摘要。搜索精度有限，可以通过改变关键词、Tag、频道、作者、时间、热度、收藏范围和排序进行最多三轮搜索。短摘要只能用于初筛；在明确推荐前必须再调用 get_resource_details 确认内容。用户偏好会由搜索 API 自动应用。参数组合示例：找今天最新的卡=今天到明天的 created 日期边界 + sort:newest；找本月热门作品=本月日期边界 + sort:reactions，必要时添加 reaction_min；找最近有讨论的作品=sort:active 或 sort:replies；只看自己收藏=search_by_collection:true。',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: '自然语言搜索关键词。逗号表示同时包含的概念，斜杠可表达同义或任选概念；搜索不理想时改用同义词、上位词或相关表达。只有 Tag 条件而不需要正文关键词时可以省略。' },
          channel_ids: {
            type: 'array',
            items: { type: 'string' },
            description: '只搜索这些频道。ID 必须来自动态上下文；不确定时省略以搜索全部偏好允许的频道。',
          },
          include_tags: {
            type: 'array',
            items: { type: 'string' },
            description: '结果必须包含的 Tag，必须来自动态上下文中的可用 Tag。',
          },
          exclude_tags: { type: 'array', items: { type: 'string' }, description: '需要排除的 Tag。' },
          include_author_ids: {
            type: 'array',
            items: { type: 'string' },
            description: '只搜索这些作者 ID。只能使用动态上下文或先前搜索结果中真实出现的作者 ID。',
          },
          exclude_author_ids: {
            type: 'array',
            items: { type: 'string' },
            description: '排除这些作者 ID，不能使用猜测的 ID。',
          },
          tag_logic: {
            type: 'string',
            enum: ['and', 'or'],
            description: '多个包含 Tag 是全部命中(and)还是任意命中(or)。',
          },
          sort: {
            type: 'string',
            enum: ['relevance', 'newest', 'active', 'reactions', 'replies'],
            description: '排序依据。关键词匹配质量最重要用 relevance；“最新发布/今天的新卡”用 newest；“最近更新/最近仍在讨论”用 active；“最火/高赞”用 reactions；“讨论最多/评论多”用 replies。',
          },
          sort_order: {
            type: 'string',
            enum: ['desc', 'asc'],
            description: '排序方向，默认 desc。最新、最热、最多回复均用 desc；只有明确寻找最早或最低数据时才用 asc。',
          },
          created_after: { type: 'string', description: '发帖日期下界，格式 YYYY-MM-DD，包含当天 00:00。' },
          created_before: { type: 'string', description: '发帖日期上界，格式 YYYY-MM-DD，不包含当天 00:00。例如搜索 2026-08-03 当天，应写 after=2026-08-03、before=2026-08-04。' },
          active_after: { type: 'string', description: '最后活跃日期下界，YYYY-MM-DD。用于“最近一周仍有更新”等需求。' },
          active_before: { type: 'string', description: '最后活跃日期上界，YYYY-MM-DD，不包含该日期。' },
          reaction_min: { type: 'integer', minimum: 0, maximum: 9999999, description: '点赞数下限，包含该值。100 表示 100+，1000 表示 1000+，3000 是站内高赞作品的明显分水岭。仅要求按热度排序时不必强设下限。' },
          reply_min: { type: 'integer', minimum: 0, maximum: 9999999, description: '评论数下限，包含该值。100 表示 100+，1000 表示 1000+，10000 表示 1万+。仅要求讨论较多时可先按 replies 排序，不必一开始就设置过高下限。' },
          search_by_collection: { type: 'boolean', description: '设为 true 时只搜索当前用户收藏的帖子；普通搜索省略或设为 false。' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_tournaments',
      description:
        '搜索公开赛事。赛事在公开 API 中是 is_tournament=true 的特殊书单；可以按关键词搜索，并按参赛作品数、浏览数、收藏数、创建时间或更新时间排序。只在用户明确寻找赛事、比赛或征集活动时使用，不要用它搜索普通书单。',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: '赛事标题或简介关键词；只需要浏览热门、最新赛事时可以省略。' },
          sort: {
            type: 'string',
            enum: ['items', 'views', 'collections', 'newest', 'updated'],
            description: '排序依据：参赛作品数、浏览数、收藏数、创建时间或更新时间。',
          },
          sort_order: { type: 'string', enum: ['desc', 'asc'], description: '排序方向，默认 desc。' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_resource_details',
      description:
        '读取已搜索候选资源的详情。支持帖子和赛事；只能读取当前会话搜索结果中真实出现过的 ID。帖子会返回首楼正文，赛事会返回简介、统计和部分参赛作品。单次最多3个资源，不要盲目批量抓取。',
      parameters: {
        type: 'object',
        properties: {
          resources: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['thread', 'tournament'] },
                id: { type: 'string', description: '搜索工具实际返回的帖子 ID 或赛事 ID。' },
              },
              required: ['type', 'id'],
              additionalProperties: false,
            },
          },
        },
        required: ['resources'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description:
        '当用户需求中的关键歧义会明显改变频道、Tag、资源类型或排序，而且无法通过一次宽泛搜索自行判断时，暂停搜索并请用户选择。调用时必须是本次 assistant 消息中唯一的工具调用。不要询问无关偏好，不要重复询问同一信息，每轮最多使用一次。',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: '简短、具体且能直接回答的问题。' },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'string' },
            description: '根据当前理解提供的二至三个互不重复的可能答案；UI 会自动补充自定义输入。',
          },
        },
        required: ['question', 'options'],
        additionalProperties: false,
      },
    },
  },
] as const;

const dateAfterSchema = z.string().refine((value) => parseDateRangeToken(`${value}..`), '日期无效');
const dateBeforeSchema = z.string().refine((value) => parseDateRangeToken(`..${value}`), '日期无效');

const searchArgsSchema = z.object({
  keywords: z.string().max(300).optional(),
  channel_ids: z.array(z.string().regex(/^\d+$/)).max(8).optional(),
  include_tags: z.array(z.string().min(1).max(80)).max(8).optional(),
  exclude_tags: z.array(z.string().min(1).max(80)).max(8).optional(),
  include_author_ids: z.array(z.string().regex(/^\d+$/)).max(8).optional(),
  exclude_author_ids: z.array(z.string().regex(/^\d+$/)).max(8).optional(),
  tag_logic: z.enum(['and', 'or']).optional(),
  sort: z.enum(['relevance', 'newest', 'active', 'reactions', 'replies']).optional(),
  sort_order: z.enum(['desc', 'asc']).optional(),
  created_after: dateAfterSchema.optional(),
  created_before: dateBeforeSchema.optional(),
  active_after: dateAfterSchema.optional(),
  active_before: dateBeforeSchema.optional(),
  reaction_min: z.number().int().min(0).max(9_999_999).optional(),
  reply_min: z.number().int().min(0).max(9_999_999).optional(),
  search_by_collection: z.boolean().optional(),
}).strict().superRefine((value, context) => {
  if (value.created_after && value.created_before && value.created_after >= value.created_before) {
    context.addIssue({ code: 'custom', message: '发帖结束日期必须晚于起始日期' });
  }
  if (value.active_after && value.active_before && value.active_after >= value.active_before) {
    context.addIssue({ code: 'custom', message: '活跃结束日期必须晚于起始日期' });
  }
});

const detailArgsSchema = z.object({
  resources: z.array(z.object({
    type: z.enum(['thread', 'tournament']),
    id: z.string().regex(/^\d+$/),
  }).strict()).min(1).max(3),
}).strict();

const tournamentSearchArgsSchema = z.object({
  keywords: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(['items', 'views', 'collections', 'newest', 'updated']).optional(),
  sort_order: z.enum(['desc', 'asc']).optional(),
}).strict();

const askUserArgsSchema = z.object({
  question: z.string().trim().min(1).max(120),
  options: z.array(z.string().trim().min(1).max(60)).min(2).max(3),
}).strict().superRefine((value, context) => {
  if (new Set(value.options).size !== value.options.length) {
    context.addIssue({ code: 'custom', message: '候选回答不能重复' });
  }
});

export function parseAISearchAskUserCall(call: AISearchToolCall): AISearchPendingQuestion {
  if (call.function.name !== 'ask_user') throw new Error('不是 ask_user 工具调用');
  const args = askUserArgsSchema.parse(JSON.parse(call.function.arguments || '{}'));
  return { toolCallId: call.id, question: args.question, options: args.options };
}

function describeToolArgumentError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join('.') || '参数'}：${issue.message}`).join('；');
  }
  if (error instanceof SyntaxError) return '参数不是合法 JSON';
  return error instanceof Error ? error.message : '参数格式未知';
}

export function findPendingAISearchQuestion(messages: AISearchDisplayMessage[]) {
  const answeredToolIds = new Set(
    messages.filter((message) => message.role === 'tool' && message.tool_call_id).map((message) => message.tool_call_id),
  );
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const call = messages[index].tool_calls?.find(
      (toolCall) => toolCall.function.name === 'ask_user' && !answeredToolIds.has(toolCall.id),
    );
    if (!call) continue;
    try {
      return parseAISearchAskUserCall(call);
    } catch {
      return null;
    }
  }
  return null;
}

const tournamentSortMap: Record<NonNullable<z.infer<typeof tournamentSearchArgsSchema>['sort']>, number> = {
  items: 1,
  views: 2,
  collections: 3,
  newest: 4,
  updated: 5,
};

const sortMap: Record<NonNullable<z.infer<typeof searchArgsSchema>['sort']>, SearchUIRequest['sort_method']> = {
  relevance: 'relevance',
  newest: 'created_desc',
  active: 'last_active_desc',
  reactions: 'reaction_desc',
  replies: 'reply_desc',
};

const sortLabels: Record<NonNullable<z.infer<typeof searchArgsSchema>['sort']>, string> = {
  relevance: '相关度',
  newest: '最新发布',
  active: '最近活跃',
  reactions: '点赞数',
  replies: '评论数',
};

function summarizeSearchArgs(args: z.infer<typeof searchArgsSchema>) {
  const parts = [
    args.keywords && `关键词：${args.keywords}`,
    args.channel_ids?.length && `频道：${args.channel_ids.join('、')}`,
    args.include_tags?.length && `包含 Tag：${args.include_tags.join('、')}`,
    args.exclude_tags?.length && `排除 Tag：${args.exclude_tags.join('、')}`,
    args.include_author_ids?.length && `作者：${args.include_author_ids.join('、')}`,
    args.exclude_author_ids?.length && `排除作者：${args.exclude_author_ids.join('、')}`,
    args.sort && `排序：${sortLabels[args.sort]}${args.sort_order === 'asc' ? '升序' : '降序'}`,
    (args.created_after || args.created_before) &&
      `发帖时间：${args.created_after || '不限'} 至 ${args.created_before || '不限'}`,
    (args.active_after || args.active_before) &&
      `活跃时间：${args.active_after || '不限'} 至 ${args.active_before || '不限'}`,
    args.reaction_min !== undefined && `点赞：${args.reaction_min}+`,
    args.reply_min !== undefined && `评论：${args.reply_min}+`,
    args.search_by_collection && '仅搜索我的收藏',
  ].filter(Boolean);
  return parts.join(' · ') || '使用当前频道与偏好搜索';
}

export function compactThread(thread: Thread) {
  return {
    thread_id: thread.thread_id,
    title: thread.title,
    author: thread.author?.display_name || thread.author?.global_name || thread.author?.name || '未知作者',
    author_id: thread.author?.id || null,
    channel_id: thread.channel_id,
    tags: [...(thread.virtual_tags || []), ...(thread.tags || [])],
    reaction_count: thread.reaction_count,
    reply_count: thread.reply_count,
    created_at: thread.created_at,
    excerpt: (thread.first_message_excerpt || '').slice(0, 200),
  };
}

export function compactTournament(tournament: Booklist) {
  return {
    tournament_id: String(tournament.id),
    tournament_channel_id: tournament.tournament_channel_id || null,
    title: tournament.title,
    description: (tournament.description || '').slice(0, 300),
    author: tournament.author?.display_name || tournament.author?.global_name || tournament.author?.name || '未知作者',
    author_id: tournament.author?.id || tournament.owner_id || null,
    item_count: tournament.item_count,
    collection_count: tournament.collection_count,
    view_count: tournament.view_count,
    created_at: tournament.created_at,
    updated_at: tournament.updated_at,
  };
}

export function createAISearchToolRuntime(
  onStatus: (status: AISearchStatus) => void,
  existingThreads: Thread[] = [],
  onTrace?: (item: AISearchToolTraceItem) => void,
  signal?: AbortSignal,
  existingResourceIds: { threadIds: string[]; tournamentIds: string[] } = { threadIds: [], tournamentIds: [] },
) {
  const searchedThreads = new Map(existingThreads.map((thread) => [thread.thread_id, thread]));
  const searchedTournaments = new Map<string, Booklist>();
  const allowedThreadIds = new Set([...existingThreads.map((thread) => thread.thread_id), ...existingResourceIds.threadIds]);
  const allowedTournamentIds = new Set(existingResourceIds.tournamentIds);
  let searchCalls = 0;
  let tournamentSearchCalls = 0;
  let detailThreads = 0;
  let detailTournaments = 0;
  let detailCharacters = 0;
  const rememberThread = (thread: Thread) => {
    allowedThreadIds.add(thread.thread_id);
    searchedThreads.delete(thread.thread_id);
    searchedThreads.set(thread.thread_id, thread);
  };

  return {
    async execute(call: AISearchToolCall) {
      let rawArgs: unknown;
      try {
        rawArgs = JSON.parse(call.function.arguments || '{}');
      } catch {
        throw new Error(`${call.function.name} 的参数不是合法 JSON`);
      }

      if (call.function.name === 'search_threads') {
        if (searchCalls >= 3) throw new Error('本轮最多执行三次搜索');
        const args = searchArgsSchema.parse(rawArgs);
        searchCalls += 1;
        onStatus('searching');
        onTrace?.({
          type: 'tool',
          id: call.id,
          tool: 'search_threads',
          label: '搜索',
          status: 'running',
          parameters: summarizeSearchArgs(args),
        });
        const response = await searchApi.search({
          query: args.keywords,
          channel_ids: args.channel_ids,
          include_tags: args.include_tags,
          exclude_tags: args.exclude_tags,
          include_authors: args.include_author_ids,
          exclude_authors: args.exclude_author_ids,
          tag_logic: args.tag_logic,
          sort_method: args.sort ? sortMap[args.sort] : 'relevance',
          sort_order: args.sort_order,
          created_after: args.created_after,
          created_before: args.created_before,
          active_after: args.active_after,
          active_before: args.active_before,
          reaction_min: args.reaction_min,
          reply_min: args.reply_min,
          search_by_collection: args.search_by_collection,
          apply_preferences: true,
          limit: 12,
        }, signal);
        const results = (response.results || []).slice(0, 12) as Thread[];
        results.forEach(rememberThread);
        onTrace?.({
          type: 'tool',
          id: call.id,
          tool: 'search_threads',
          label: '搜索',
          status: 'complete',
          parameters: summarizeSearchArgs(args),
          result: `找到 ${response.total ?? results.length} 条候选内容`,
        });
        return JSON.stringify({ total: response.total, results: results.map(compactThread) });
      }

      if (call.function.name === 'search_tournaments') {
        if (tournamentSearchCalls >= 2) throw new Error('本轮最多执行两次赛事搜索');
        const args = tournamentSearchArgsSchema.parse(rawArgs);
        tournamentSearchCalls += 1;
        onStatus('searching');
        const parameters = [
          args.keywords && `关键词：${args.keywords}`,
          args.sort && `排序：${args.sort}`,
          args.sort_order === 'asc' && '升序',
        ].filter(Boolean).join(' · ') || '浏览公开赛事';
        onTrace?.({
          type: 'tool',
          id: call.id,
          tool: 'search_tournaments',
          label: '搜索赛事',
          status: 'running',
          parameters,
        });
        const response = await booklistsApi.listPublic({
          pageIndex: 0,
          pageSize: 8,
          keywords: args.keywords,
          sortMethod: args.sort ? tournamentSortMap[args.sort] : 5,
          sortOrder: args.sort_order || 'desc',
          isTournament: true,
        }, signal);
        const results = (response.results || []).filter((item) => item.is_tournament).slice(0, 8);
        results.forEach((item) => {
          const id = String(item.id);
          allowedTournamentIds.add(id);
          searchedTournaments.set(id, item);
        });
        onTrace?.({
          type: 'tool',
          id: call.id,
          tool: 'search_tournaments',
          label: '搜索赛事',
          status: 'complete',
          parameters,
          result: `找到 ${response.total ?? results.length} 个赛事`,
        });
        return JSON.stringify({ total: response.total, results: results.map(compactTournament) });
      }

      if (call.function.name === 'get_resource_details' || call.function.name === 'get_thread_details') {
        const normalizedArgs = call.function.name === 'get_thread_details'
          ? { resources: z.object({ thread_ids: z.array(z.string().regex(/^\d+$/)).min(1).max(3) }).parse(rawArgs).thread_ids.map((id) => ({ type: 'thread' as const, id })) }
          : detailArgsSchema.parse(rawArgs);
        const args = detailArgsSchema.parse(normalizedArgs);
        const uniqueResources = Array.from(new Map(
          args.resources.map((resource) => [`${resource.type}:${resource.id}`, resource]),
        ).values());
        const threadResources = uniqueResources.filter((resource) => resource.type === 'thread');
        const tournamentResources = uniqueResources.filter((resource) => resource.type === 'tournament');
        if (detailThreads + threadResources.length > 8) throw new Error('本轮最多读取八篇帖子详情');
        if (detailTournaments + tournamentResources.length > 4) throw new Error('本轮最多读取四个赛事详情');
        const unknownThread = threadResources.find((resource) => !allowedThreadIds.has(resource.id));
        if (unknownThread) throw new Error(`帖子 ${unknownThread.id} 不在本会话搜索结果中`);
        const unknownTournament = tournamentResources.find((resource) => !allowedTournamentIds.has(resource.id));
        if (unknownTournament) throw new Error(`赛事 ${unknownTournament.id} 不在本轮搜索结果中`);

        onStatus('reading');
        onTrace?.({
          type: 'tool',
          id: call.id,
          tool: 'get_resource_details',
          label: '读取详情',
          status: 'running',
          parameters: `读取 ${uniqueResources.length} 个候选资源`,
        });
        const threadDetails = await Promise.all(threadResources.map((resource) => searchApi.getThread(resource.id, signal)));
        const tournamentDetails = await Promise.all(tournamentResources.map(async (resource) => {
          const [detail, items] = await Promise.all([
            booklistsApi.getDetail(resource.id, signal),
            booklistsApi.listItems(resource.id, { limit: 8, offset: 0 }, signal),
          ]);
          searchedTournaments.set(resource.id, detail);
          return { detail, items: items.results || [] };
        }));
        detailThreads += threadDetails.length;
        detailTournaments += tournamentDetails.length;
        threadDetails.forEach(rememberThread);
        onTrace?.({
          type: 'tool',
          id: call.id,
          tool: 'get_resource_details',
          label: '读取详情',
          status: 'complete',
          parameters: `读取 ${uniqueResources.length} 个候选资源`,
          result: `成功读取 ${uniqueResources.length} 个资源`,
        });
        return JSON.stringify({
          results: [
            ...threadDetails.map((thread) => {
              const remaining = Math.max(0, 8000 - detailCharacters);
              const content = (thread.first_message_excerpt || '').slice(0, Math.min(2000, remaining));
              detailCharacters += content.length;
              return {
                type: 'thread',
                thread_id: thread.thread_id,
                title: thread.title,
                author: thread.author?.display_name || thread.author?.global_name || thread.author?.name || '未知作者',
                author_id: thread.author?.id || null,
                tags: [...(thread.virtual_tags || []), ...(thread.tags || [])],
                content,
                truncated: content.length < (thread.first_message_excerpt || '').length,
              };
            }),
            ...tournamentDetails.map(({ detail, items }) => ({
              type: 'tournament',
              ...compactTournament(detail),
              entries: items.slice(0, 8).map((item) => ({
                thread_id: String(item.thread_id),
                title: item.title,
                comment: item.comment || null,
              })),
            })),
          ],
        });
      }

      if (call.function.name === 'ask_user') {
        try {
          parseAISearchAskUserCall(call);
        } catch (error) {
          throw Object.assign(
            new Error(`ask_user 参数无效：${describeToolArgumentError(error)}`),
            { cause: error },
          );
        }
        throw new Error('ask_user 必须作为本次回复中唯一的工具调用');
      }

      throw new Error(`不支持的工具：${call.function.name}`);
    },
    getThreads() {
      return Array.from(searchedThreads.values()).slice(-36);
    },
  };
}
