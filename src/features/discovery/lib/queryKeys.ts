export const discoveryKeys = {
  all: ["discovery"] as const,
  rail: (params: { key: string; limit: number; days: number; applyPreferences: boolean }) =>
    [...discoveryKeys.all, "rail", { params }] as const,
  rails: (params: { limit: number; days: number; applyPreferences: boolean }) =>
    [...discoveryKeys.all, "rails", { params }] as const,
};
