type ImageRecoveryListener = (urls: string[]) => void;

interface ImageRecoveryAdapter {
  report: (payload: { threadId: string; channelId?: string }) => void;
  subscribe: (
    threadId: string,
    handler: ImageRecoveryListener,
  ) => () => void;
}

let adapter: ImageRecoveryAdapter | null = null;

export function configureImageRecovery(nextAdapter: ImageRecoveryAdapter) {
  adapter = nextAdapter;
}

export function reportBrokenImage(payload: {
  threadId: string;
  channelId?: string;
}) {
  adapter?.report(payload);
}

export function subscribeImageRecovery(
  threadId: string,
  handler: ImageRecoveryListener,
) {
  return adapter?.subscribe(threadId, handler);
}
