export const discoveryKeys = {
  all: ["discovery"] as const,
  rails: (params: { limit: number; days: number; applyPreferences: boolean }) =>
    [...discoveryKeys.all, "rails", { params }] as const,
};
