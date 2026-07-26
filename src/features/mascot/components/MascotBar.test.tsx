import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { MascotBar } from "./MascotBar";
import { useMascotStore } from "../store/mascotStore";

describe("MascotBar", () => {
  beforeEach(() => {
    useMascotStore.setState({
      emotion: "hi",
      message: "测试消息",
      isVisible: false,
    });
  });

  it("隐藏时图片和对话框不应该占据点击空间", () => {
    const { container } = render(<MascotBar />);
    const root = container.firstElementChild as HTMLElement;
    const [image, dialog] = Array.from(root.children);

    expect(image).toHaveClass("pointer-events-none");
    expect(dialog).toHaveClass("pointer-events-none");
  });

  it("显示时应该恢复图片和对话框交互", () => {
    useMascotStore.setState({ isVisible: true });

    const { container } = render(<MascotBar />);
    const root = container.firstElementChild as HTMLElement;
    const [image, dialog] = Array.from(root.children);

    expect(image).toHaveClass("pointer-events-auto");
    expect(dialog).toHaveClass("pointer-events-auto");
  });
});
