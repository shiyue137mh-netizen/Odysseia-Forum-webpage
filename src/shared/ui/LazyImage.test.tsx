import { render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeImageRecovery } from "@/shared/lib/imageRecovery";
import { LazyImage } from "./LazyImage";

vi.mock("@/shared/hooks/useSettings", () => ({
  useImageModeSetting: () => "off",
}));

vi.mock("@/shared/lib/imageRecovery", () => ({
  reportBrokenImage: vi.fn(),
  subscribeImageRecovery: vi.fn(),
}));

describe("LazyImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("图片关闭时不订阅恢复，也不创建 IntersectionObserver", () => {
    const observer = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: observer,
        disconnect: vi.fn(),
        unobserve: vi.fn(),
        takeRecords: vi.fn(() => []),
        root: null,
        rootMargin: "",
        thresholds: [],
      })),
    );

    render(
      <LazyImage
        src="https://example.com/image.png"
        threadId="thread-1"
        alt="测试图片"
      />,
    );

    expect(screen.getByText("图片已关闭")).toBeInTheDocument();
    expect(subscribeImageRecovery).not.toHaveBeenCalled();
    expect(IntersectionObserver).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
  });
});
