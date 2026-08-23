import type { RateLimitInfo } from "@/shared/api/rateLimit";
import { formatRateLimitMessage } from "@/shared/lib/notify";
import {
  showMascotToast,
  type MascotToastOptions,
} from "@/features/mascot/lib/mascotToast";

interface NotifyMessageOptions extends MascotToastOptions {
  description?: string;
}

const DEFAULT_DURATION = 5200;

export function notifySuccess(message: string, options?: NotifyMessageOptions) {
  return showMascotToast({
    emotion: "success",
    title: "好消息！",
    message,
    duration: DEFAULT_DURATION,
    ...options,
  });
}

export function notifyError(message: string, options?: NotifyMessageOptions) {
  return showMascotToast({
    emotion: "complaint",
    title: "出了点小状况",
    message,
    duration: 6000,
    ...options,
  });
}

export function notifyRateLimit(info: RateLimitInfo) {
  return showMascotToast({
    id: `${info.scope}-rate-limit`,
    emotion: "complaint",
    eyebrow: "Rate Limit",
    title: "操作有点频繁",
    message: formatRateLimitMessage(info),
    duration: 6000,
  });
}
