import { useCallback } from 'react';

import { usePreviewStore } from '@/features/search/store/previewStore';
import type { Thread } from '@/entities/thread/types';

export function usePreviewThread() {
  const setPreviewThread = usePreviewStore((state) => state.setPreviewThread);
  const setPreviewThreadId = usePreviewStore((state) => state.setPreviewThreadId);

  // useCallback 保证引用稳定：openPreview 会作为 onPreview 传给 memo 化的
  // ThreadCard / ThreadListItem，引用一变整个列表的 memo 就全部失效。
  const openPreview = useCallback(
    (thread: Thread) => {
      setPreviewThread(thread);
    },
    [setPreviewThread],
  );

  const openPreviewById = useCallback(
    (threadId: string) => {
      setPreviewThreadId(threadId);
    },
    [setPreviewThreadId],
  );

  return {
    openPreview,
    openPreviewById,
  };
}
