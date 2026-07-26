import axios from 'axios';
import { showMascotToast, type MascotToastOptions } from '@/features/mascot/lib/mascotToast';

interface NotifyMessageOptions extends MascotToastOptions {
  description?: string;
}

const DEFAULT_DURATION = 5200;

export function notifySuccess(message: string, options?: NotifyMessageOptions) {
  return showMascotToast({
    emotion: 'success',
    title: '好消息！',
    message,
    duration: DEFAULT_DURATION,
    ...options,
  });
}


export function notifyError(message: string, options?: NotifyMessageOptions) {
  // 这里的 message 可能是后端返回的原始错误，我们后续可以增加更智能的解析
  return showMascotToast({
    emotion: 'complaint',
    title: '出了点小状况',
    message,
    duration: 6000,
    ...options,
  });
}

export function extractErrorMessage(error: unknown, fallback = '操作未完成，请稍后再试') {
  if (axios.isAxiosError(error)) {
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
