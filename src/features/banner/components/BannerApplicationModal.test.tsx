import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/tests/test-utils";
import { BannerApplicationModal } from "./BannerApplicationModal";

const mocks = vi.hoisted(() => ({
  apply: vi.fn(),
  notifySuccess: vi.fn(),
  showMascotToast: vi.fn(),
}));

vi.mock("@/features/banner/api/bannerApi", () => ({
  bannerApi: { apply: mocks.apply },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "123456789012345678" } }),
}));
vi.mock("@/shared/hooks/useChannels", () => ({
  useChannels: () => ({
    isLoading: false,
    data: {
      source: "api",
      channels: [{ id: "111111111111111111", name: "测试频道" }],
    },
  }),
}));
vi.mock("@/features/mascot/lib/notify", () => ({
  notifySuccess: mocks.notifySuccess,
}));
vi.mock("@/features/mascot/lib/mascotToast", () => ({
  showMascotToast: mocks.showMascotToast,
}));

describe("BannerApplicationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apply.mockResolvedValue({
      success: true,
      message: "申请已提交",
      application_id: 1,
    });
  });

  it("快速申请模式绑定当前作品并省略空封面", async () => {
    const onClose = vi.fn();
    render(
      <BannerApplicationModal
        isOpen
        initialThread={{
          thread_id: "987654321098765432",
          title: "需要申请 Banner 的作品",
        }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("需要申请 Banner 的作品")).toBeInTheDocument();
    expect(screen.getByText("987654321098765432")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("纯数字 ID 或 Discord 帖子链接"),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: /展示范围/ }), {
      target: { value: "111111111111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交申请" }));

    await waitFor(() =>
      expect(mocks.apply).toHaveBeenCalledWith({
        thread_link: "987654321098765432",
        cover_image_url: undefined,
        target_scope: "111111111111111111",
      }),
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      "Banner 申请已提交，请等待审核",
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("普通入口仍保留手动填写帖子 ID", () => {
    render(<BannerApplicationModal isOpen onClose={vi.fn()} />);

    expect(
      screen.getByPlaceholderText("纯数字 ID 或 Discord 帖子链接"),
    ).toBeInTheDocument();
  });
});
