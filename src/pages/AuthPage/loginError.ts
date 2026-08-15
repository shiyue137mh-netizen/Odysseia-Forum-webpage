const MAX_LOGIN_ERROR_LENGTH = 240;

export function normalizeLoginError(rawError: string | null): string | null {
  if (rawError === null) return null;

  const normalized = rawError.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  return normalized.slice(0, MAX_LOGIN_ERROR_LENGTH);
}

export function clearLoginErrorParams(searchParams: URLSearchParams): URLSearchParams {
  const cleanedParams = new URLSearchParams(searchParams);
  cleanedParams.delete('error');
  cleanedParams.delete('status');
  return cleanedParams;
}
