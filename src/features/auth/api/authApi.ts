import { apiClient } from '@/shared/api/client';
import {
  getStoredAuthToken,
  invalidateAuthSession,
  setUseAuthHeader,
} from '@/shared/lib/authSession';

export interface User {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
}

export interface AuthResponse {
  loggedIn: boolean;
  user?: User;
  // 当前用户关注列表的未读更新数量（来自 /auth/checkauth）
  unread_count?: number;
}

export const authApi = {
  checkAuth: async (): Promise<AuthResponse> => {
    try {
      const response = await apiClient.get<AuthResponse>('/auth/checkauth', {
        skipAuthHeader: true,
      });

      if (response.data.loggedIn) {
        setUseAuthHeader(false);
        return response.data;
      }

      return await tryFallbackToAuthHeader();
    } catch (cookieError) {
      const token = getStoredAuthToken();
      if (!token) throw cookieError;
      return await tryFallbackToAuthHeader(token);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.get('/auth/logout', {
        // 当前后端会 302 到前端 HTML；登出已成功，不能再交给全局 JSON 解析器。
        transformResponse: (data) => data,
      });
    } finally {
      invalidateAuthSession();
    }
  },
};

async function tryFallbackToAuthHeader(storedToken?: string): Promise<AuthResponse> {
  const token = storedToken || getStoredAuthToken();
  if (!token) return { loggedIn: false };

  const response = await apiClient.get<AuthResponse>('/auth/checkauth', {
    headers: { Authorization: `Bearer ${token}` },
    skipAuthHeader: true,
  });
  if (response.data.loggedIn) {
    setUseAuthHeader(true);
    return response.data;
  }

  return { loggedIn: false };
}
