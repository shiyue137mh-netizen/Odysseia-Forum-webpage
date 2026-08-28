import type { FollowsQueryParams } from '@/features/follows/api/followsApi';
import type { AuthorFollowsQueryParams } from '@/features/follows/api/authorFollowsApi';

export const followsKeys = {
  all: ['follows'] as const,
  list: (params: FollowsQueryParams = {}) => [...followsKeys.all, 'list', params] as const,
  unreadCount: () => [...followsKeys.all, 'unread-count'] as const,
};

export const authorFollowKeys = {
  all: [...followsKeys.all, "authors"] as const,
  lists: () => [...authorFollowKeys.all, "list"] as const,
  list: (params: AuthorFollowsQueryParams = {}) =>
    [...authorFollowKeys.lists(), params] as const,
  state: (authorId: string) =>
    [...authorFollowKeys.all, "state", authorId] as const,
};
