export const authorKeys = {
  all: ["authors"] as const,
  profile: (authorId: string) =>
    [...authorKeys.all, "profile", authorId] as const,
  threads: (
    authorId: string,
    params: { sortMethod: string; channelIds: string[] },
  ) => [...authorKeys.all, "threads", authorId, params] as const,
  recentWorks: (authorId: string, excludeThreadId?: string) =>
    [...authorKeys.all, "recent-works", authorId, excludeThreadId ?? null] as const,
};
