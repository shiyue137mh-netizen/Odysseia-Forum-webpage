import axios from 'axios';
import { clearStoredAuthToken, getStoredAuthToken, isUsingAuthHeader } from '@/shared/lib/authSession';

const DEFAULT_API_URL = 'http://localhost:10810/v1';
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

// 在生产环境下如果未配置 VITE_API_URL，则给出警告，避免悄悄回退到本地地址
if (!import.meta.env.VITE_API_URL && import.meta.env.MODE === 'production') {
  console.warn('[API] VITE_API_URL is not set in production; falling back to default URL:', DEFAULT_API_URL);
}

// 【状态更新：2026-04-21】后端已开始逐步将 Snowflake ID 转换为原生字符串（如 thread_id, guild_id）。
// 核心动机：彻底解决 JavaScript 精度导致的 ID 损坏问题。
// 虽然核心 ID 已转为 string，但部分字段（如 tag_id）经实测仍为 int，因此仍需在解析前修复。
//
// 只匹配「以 _id 结尾或名为 id 的键 + 16 位以上数字」。此前的 `/: (\d{16,})/g` 作用于整个
// 响应文本、不看键名，帖子正文里出现 `": 1234567890123456"` 就会在字符串值内部插入裸引号，
// 导致 JSON.parse 抛错后静默回退——那条路径下所有长 ID 都未被字符串化，精度已损坏且无任何日志。
//
// 对后端已引号化的 `"thread_id": "..."` 幂等（冒号后是引号而非数字，不匹配）。
// 数组元素（如 `"ids": [123..., 456...]`）不在覆盖范围内，与修改前的行为一致。
const LONG_ID_ENTRY = /"([A-Za-z_][A-Za-z0-9_]*_id|id)"(\s*:\s*)(\d{16,})/g;

export const parseWithSafeSnowflakeIds = (data: unknown) => {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data.replace(LONG_ID_ENTRY, '"$1"$2"$3"'));
  } catch (error) {
    // 走到这里说明修复后的文本反而不合法，回退到原始响应。此时长 ID 精度可能已损坏，
    // 必须留下线索，不能再静默吞掉。
    console.error('[API] Snowflake ID 预处理后 JSON 解析失败，已回退到原始响应', error);
    return JSON.parse(data);
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
  transformResponse: [parseWithSafeSnowflakeIds],
});

// 请求拦截器：当检测到跨域 cookie 被拦截时，回退到 Authorization header
apiClient.interceptors.request.use((config) => {
  if (isUsingAuthHeader() && !config.skipAuthHeader) {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 只在非认证检查的请求中处理401
    // 认证检查接口应该由组件自己处理
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/checkauth')) {
      clearStoredAuthToken();
      // 不要直接跳转，让ProtectedRoute处理
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
