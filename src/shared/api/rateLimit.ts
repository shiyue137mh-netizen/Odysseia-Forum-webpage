import axios from "axios";

export type RateLimitScope = "search" | "global";
export type RateLimitOrigin = "foreground" | "preload";

export interface RateLimitInfo {
  scope: RateLimitScope;
  origin: RateLimitOrigin;
  retryAfterSeconds: number | null;
  retryAt: number | null;
}

const cooldowns = new Map<RateLimitScope, number>();

export class RateLimitError extends Error {
  readonly rateLimit: RateLimitInfo;
  readonly originalError: unknown;

  constructor(rateLimit: RateLimitInfo, originalError?: unknown) {
    super("Request rate limited");
    this.name = "RateLimitError";
    this.rateLimit = rateLimit;
    this.originalError = originalError;
  }
}

export function parseRetryAfter(
  value: unknown,
  now = Date.now(),
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.ceil(value));
  }

  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value.trim();
  const seconds = Number(normalized);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));

  const retryAt = Date.parse(normalized);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, Math.ceil((retryAt - now) / 1000));
}

export function getRateLimitInfo(
  error: unknown,
  defaults: Partial<Pick<RateLimitInfo, "scope" | "origin">> = {},
  now = Date.now(),
): RateLimitInfo | null {
  if (error instanceof RateLimitError) {
    return {
      ...error.rateLimit,
      retryAfterSeconds: getRemainingRateLimitSeconds(error.rateLimit, now),
    };
  }

  if (!axios.isAxiosError(error) || error.response?.status !== 429) return null;

  const headers = error.response.headers;
  const retryAfter = headers?.["retry-after"] ?? headers?.["Retry-After"];
  const retryAfterSeconds = parseRetryAfter(retryAfter, now);
  const requestUrl = String(error.config?.url || "");
  const scope =
    defaults.scope || (requestUrl.includes("/search") ? "search" : "global");

  return {
    scope,
    origin: defaults.origin || "foreground",
    retryAfterSeconds,
    retryAt: retryAfterSeconds === null ? null : now + retryAfterSeconds * 1000,
  };
}

export function rememberRateLimit(info: RateLimitInfo): RateLimitInfo {
  if (info.retryAt !== null) {
    const current = cooldowns.get(info.scope) || 0;
    cooldowns.set(info.scope, Math.max(current, info.retryAt));
  }
  return info;
}

export function getActiveRateLimit(
  scope: RateLimitScope,
  origin: RateLimitOrigin = "foreground",
  now = Date.now(),
): RateLimitInfo | null {
  const retryAt = cooldowns.get(scope);
  if (!retryAt) return null;
  if (retryAt <= now) {
    cooldowns.delete(scope);
    return null;
  }

  return {
    scope,
    origin,
    retryAt,
    retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now) / 1000)),
  };
}

export function getRemainingRateLimitSeconds(
  info: Pick<RateLimitInfo, "retryAt" | "retryAfterSeconds">,
  now = Date.now(),
): number | null {
  if (info.retryAt === null) return info.retryAfterSeconds;
  return Math.max(0, Math.ceil((info.retryAt - now) / 1000));
}

export function isSilentPreloadRateLimit(error: unknown): boolean {
  return getRateLimitInfo(error)?.origin === "preload";
}

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (getRateLimitInfo(error)) return false;
  return failureCount < 1;
}

export function resetRateLimitStateForTests() {
  cooldowns.clear();
}
