import axios from 'axios';
import {
  getRateLimitInfo,
  getRemainingRateLimitSeconds,
  type RateLimitInfo,
} from '@/shared/api/rateLimit';

export function formatRateLimitMessage(info: RateLimitInfo, now = Date.now()) {
  const remaining = getRemainingRateLimitSeconds(info, now);
  const subject = info.scope === 'search' ? '搜索' : '操作';
  return remaining === null
    ? `${subject}有点频繁，请稍后再试。`
    : `${subject}有点频繁，请在 ${remaining} 秒后再试。`;
}

export function extractErrorMessage(error: unknown, fallback = '操作未完成，请稍后再试') {
  if (axios.isAxiosError(error)) {
    const rateLimit = getRateLimitInfo(error);
    if (rateLimit) return formatRateLimitMessage(rateLimit);
    const responseMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.response?.data?.error;

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage.trim();
    }

    if (error.code === 'ECONNABORTED') {
      return '请求超时，请稍后重试';
    }

    if (!error.response) {
      return '网络连接异常，请检查网络后重试';
    }

    if (error.response.status === 401) {
      return '登录状态已失效，请重新登录';
    }

    if (error.response.status === 403) {
      return '当前没有执行这个操作的权限';
    }

    if (error.response.status === 404) {
      return '目标内容不存在或已被移除';
    }

    if (error.response.status >= 500) {
      return '服务器暂时开小差了，请稍后再试';
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
