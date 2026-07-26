import type { FollowsQueryParams } from '@/features/follows/api/followsApi';

export const followsKeys = {
  all: ['follows'] as const,
  list: (params: FollowsQueryParams = {}) => [...followsKeys.all, 'list', params] as const,
  unreadCount: () => [...followsKeys.all, 'unread-count'] as const,
};
