import type { AISearchToolCall } from '@/features/ai-search/lib/tools';

import { getProviderEndpoint } from './modelsApi';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: AISearchToolCall[];
  reasoning_content?: string;
}

export interface ChatTokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface ChatCompletionMessage {
  role?: 'assistant';
  content?: string | null;
  tool_calls?: AISearchToolCall[];
  reasoning_content?: string | null;
  reasoning?: string | null;
}

interface ChatCompletionResponse {
  usage?: ChatTokenUsage;
  choices?: Array<{
    message?: ChatCompletionMessage;
    reasoning_content?: string | null;
  }>;
}

interface ChatCompletionChunk {
  usage?: ChatTokenUsage | null;
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    reasoning_content?: string | null;
  }>;
}

interface ChatCompletionCallbacks {
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
}

function getReasoningText(
  message: { reasoning_content?: string | null; reasoning?: string | null } | undefined,
  choiceReasoning?: string | null,
) {
  return (
    (typeof message?.reasoning_content === 'string' && message.reasoning_content) ||
    (typeof message?.reasoning === 'string' && message.reasoning) ||
    (typeof choiceReasoning === 'string' && choiceReasoning) ||
    undefined
  );
}

async function parseJSONCompletion(
  response: Response,
  callbacks: ChatCompletionCallbacks,
) {
  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new Error('模型服务返回了无法解析的响应');
  }

  const choice = payload.choices?.[0];
  const message = choice?.message;
  if (!message) throw new Error('模型服务没有返回 assistant 消息');

  const content = typeof message.content === 'string' ? message.content : null;
  const reasoning = getReasoningText(message, choice?.reasoning_content);
  if (content) callbacks.onContentDelta?.(content);
  if (reasoning) callbacks.onReasoningDelta?.(reasoning);
  return {
    role: 'assistant' as const,
    content,
    tool_calls: Array.isArray(message.tool_calls) ? message.tool_calls : undefined,
    reasoning_content: reasoning,
    usage: payload.usage,
  };
}

async function parseStreamCompletion(
  response: Response,
  callbacks: ChatCompletionCallbacks,
) {
  if (!response.body) throw new Error('模型服务没有返回可读取的流');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
  let buffer = '';
  let eventData: string[] = [];
  let content = '';
  let reasoning = '';
  let done = false;
  let usage: ChatTokenUsage | undefined;

  const processEvent = () => {
    if (eventData.length === 0 || done) return;
    const data = eventData.join('\n').trim();
    eventData = [];
    if (!data) return;
    if (data === '[DONE]') {
      done = true;
      return;
    }

    let payload: ChatCompletionChunk;
    try {
      payload = JSON.parse(data) as ChatCompletionChunk;
    } catch {
      throw new Error('模型流式响应包含无法解析的数据');
    }
    if (payload.usage) usage = payload.usage;
    const choice = payload.choices?.[0];
    const delta = choice?.delta;
    if (!delta) return;

    if (typeof delta.content === 'string' && delta.content) {
      content += delta.content;
      callbacks.onContentDelta?.(delta.content);
    }
    const reasoningDelta = getReasoningText(delta, choice?.reasoning_content);
    if (reasoningDelta) {
      reasoning += reasoningDelta;
      callbacks.onReasoningDelta?.(reasoningDelta);
    }

    for (const toolDelta of delta.tool_calls || []) {
      const index = toolDelta.index ?? 0;
      const current = toolCalls.get(index) || { id: '', name: '', arguments: '' };
      if (toolDelta.id) current.id = toolDelta.id;
      if (toolDelta.function?.name) current.name += toolDelta.function.name;
      if (toolDelta.function?.arguments) current.arguments += toolDelta.function.arguments;
      toolCalls.set(index, current);
    }
  };

  const processLines = (flush = false) => {
    const lines = buffer.split(/\r?\n/);
    buffer = flush ? '' : lines.pop() || '';
    for (const line of lines) {
      if (!line) {
        processEvent();
      } else if (line.startsWith('data:')) {
        eventData.push(line.slice(5).trimStart());
      }
    }
    if (flush) processEvent();
  };

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !readerDone });
      processLines(readerDone);
    }
    if (readerDone) {
      buffer += decoder.decode();
      processLines(true);
      break;
    }
  }

  return {
    role: 'assistant' as const,
    content: content || null,
    tool_calls: toolCalls.size
      ? Array.from(toolCalls.entries())
          .sort(([left], [right]) => left - right)
          .map(([index, toolCall]) => ({
            id: toolCall.id || `tool-call-${index}`,
            type: 'function' as const,
            function: { name: toolCall.name, arguments: toolCall.arguments },
          }))
      : undefined,
    reasoning_content: reasoning || undefined,
    usage,
  };
}

export async function createChatCompletion({
  baseUrl,
  apiKey,
  model,
  sendClientHeader,
  messages,
  tools,
  onContentDelta,
  onReasoningDelta,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  sendClientHeader: boolean;
  messages: ChatMessage[];
  tools: readonly unknown[];
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  signal?: AbortSignal;
}) {
  const headers: Record<string, string> = {
    Accept: 'text/event-stream, application/json',
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  if (sendClientHeader) headers['X-Client-Name'] = 'odysseia-forum-webpage';

  let response: Response;
  try {
    response = await fetch(getProviderEndpoint(baseUrl, 'chat/completions'), {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        stream: true,
        stream_options: { include_usage: true },
      }),
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    throw new Error('无法连接模型服务，请检查网络或 CORS 设置');
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('模型服务拒绝了 API Key');
    const detail = (await response.text()).trim().slice(0, 500);
    throw new Error(`模型请求失败，服务返回 ${response.status}${detail ? `：${detail}` : ''}`);
  }

  const callbacks = { onContentDelta, onReasoningDelta };
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('text/event-stream')
    ? parseStreamCompletion(response, callbacks)
    : parseJSONCompletion(response, callbacks);
}
