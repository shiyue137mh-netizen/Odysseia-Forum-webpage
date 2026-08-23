import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

import type { Thread } from "@/entities/thread/types";
import { searchApi } from "@/features/search/api/searchApi";
import { searchKeys } from "@/features/search/lib/queryKeys";
import { usePreviewStore } from "@/features/search/store/previewStore";
import { CompactThreadCard } from "@/features/threads/components/CompactThreadCard";

interface SimilarRecommendationsProps {
  currentThreadId: string;
}

export function SimilarRecommendations({
  currentThreadId,
}: SimilarRecommendationsProps) {
  const setPreviewThreadId = usePreviewStore(
    (state) => state.setPreviewThreadId,
  );

  const { data, isLoading } = useQuery({
    queryKey: [...searchKeys.thread(currentThreadId), "similar"],
    queryFn: () => searchApi.getSimilarThreads(currentThreadId, 6),
    enabled: !!currentThreadId,
    staleTime: 5 * 60 * 1000,
  });

  const threads = useMemo(
    () =>
      ((data?.results || []) as Thread[]).filter(
        (thread) => thread.thread_id !== currentThreadId,
      ),
    [currentThreadId, data?.results],
  );

  if (isLoading) {
    return (
      <div className="mt-12 border-t border-(--od-shell-line) pt-8">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-(--od-accent)" />
          <h3 className="text-lg font-bold text-(--od-text-primary)">
            相似推荐
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square animate-pulse rounded-xl bg-(--od-surface-input)" />
              <div className="mt-2 h-8 animate-pulse rounded-md bg-(--od-surface-input)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (threads.length === 0) return null;

  return (
    <div className="mt-12 border-t border-(--od-shell-line) pt-8">
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-(--od-text-primary)">
          <Sparkles className="h-5 w-5 text-(--od-accent)" />
          相似推荐
        </h3>
        {(data?.matched_tag_count ?? 0) > 0 && (
          <p className="mt-1 text-sm text-(--od-text-tertiary)">
            基于 {data?.matched_tag_count} 个共同标签匹配
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {threads.map((thread, index) => (
          <motion.div
            key={thread.thread_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CompactThreadCard
              thread={thread}
              onOpen={(item) => setPreviewThreadId(item.thread_id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
