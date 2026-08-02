const CLIENT_NAME = 'odysseia-forum-webpage';

export function getProviderEndpoint(baseUrl: string, path: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  if (!normalized) throw new Error('请先填写 API Base URL');

  let url: URL;
  try {
    url = new URL(`${normalized}/${path.replace(/^\/+/, '')}`);
  } catch {
    throw new Error('API Base URL 格式不正确');
  }

  const isLocalHttp =
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('模型服务必须使用 HTTPS，本地服务除外');
  }

  return url.toString();
}

export function parseModelIds(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { data?: unknown }).data)) {
    throw new Error('模型服务返回了不兼容的模型列表');
  }

  return Array.from(
    new Set(
      (value as { data: unknown[] }).data
        .map((item) =>
          item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'
            ? (item as { id: string }).id.trim()
            : '',
        )
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export async function fetchModelIds({
  baseUrl,
  apiKey,
  sendClientHeader,
}: {
  baseUrl: string;
  apiKey: string;
  sendClientHeader: boolean;
}) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  if (sendClientHeader) headers['X-Client-Name'] = CLIENT_NAME;

  let response: Response;
  try {
    response = await fetch(getProviderEndpoint(baseUrl, 'models'), { headers });
  } catch {
    throw new Error('无法连接模型服务，请检查地址、网络或 CORS 设置');
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('模型服务拒绝了 API Key');
    }
    throw new Error(`获取模型失败，服务返回 ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('模型服务返回了无法解析的响应');
  }

  const modelIds = parseModelIds(payload);
  if (modelIds.length === 0) throw new Error('模型服务没有返回可用模型');
  return modelIds;
}
