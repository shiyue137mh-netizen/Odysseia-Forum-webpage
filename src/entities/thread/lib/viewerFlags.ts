import type { Thread, ViewerFlag } from "@/entities/thread/types";

export function hasViewerFlag(
  thread: Pick<Thread, "viewer_flags">,
  flag: ViewerFlag,
): boolean {
  return (thread.viewer_flags ?? []).includes(flag);
}
