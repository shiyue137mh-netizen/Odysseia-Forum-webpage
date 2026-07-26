import type { ReactNode } from "react";

interface PageStatusMessageProps {
  /** muted 用于加载中等中性提示，error 用于无效 ID / 加载失败等错误提示 */
  tone?: "muted" | "error";
  children: ReactNode;
}

/**
 * 详情页早退时的整页状态提示（无效 ID / 加载中 / 加载失败 / 无权限）。
 * 只负责渲染；isLoading/isError 的判断留在页面里，以保住 TS 对
 * query.data 的非空收窄。
 */
export function PageStatusMessage({
  tone = "muted",
  children,
}: PageStatusMessageProps) {
  return (
    <div
      className={`p-8 text-sm ${
        tone === "error" ? "text-(--od-error)" : "text-(--od-text-secondary)"
      }`}
    >
      {children}
    </div>
  );
}
