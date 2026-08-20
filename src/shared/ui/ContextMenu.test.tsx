import { fireEvent, render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ContextMenu";

describe("ContextMenu 通用上下文菜单组件", () => {
  it("在 PC 端右键点击时应该展示菜单，点击条目后触发回调并关闭", () => {
    const handleEdit = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="target-card">书单卡片</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleEdit}>编辑书单</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="danger">删除书单</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(screen.queryByText("编辑书单")).not.toBeInTheDocument();

    const trigger = screen.getByTestId("target-card");
    fireEvent.contextMenu(trigger, { clientX: 100, clientY: 200 });

    expect(screen.getByText("编辑书单")).toBeInTheDocument();
    expect(screen.getByText("删除书单")).toBeInTheDocument();

    fireEvent.click(screen.getByText("编辑书单"));
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("编辑书单")).not.toBeInTheDocument();
  });

  it("在移动端长按 500ms 时应该触发菜单呼起", () => {
    vi.useFakeTimers();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="touch-card">长按目标</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>操作项</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    const trigger = screen.getByTestId("touch-card");

    fireEvent.touchStart(trigger, {
      touches: [{ clientX: 50, clientY: 50 }],
    });

    // 尚未达到 500ms 不应呼起
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText("操作项")).not.toBeInTheDocument();

    // 达到 500ms 呼起
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText("操作项")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("在移动端滑动超过 10px 时应该视为滚动并取消长按呼起", () => {
    vi.useFakeTimers();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="scroll-card">滑动目标</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>操作项</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    const trigger = screen.getByTestId("scroll-card");

    fireEvent.touchStart(trigger, {
      touches: [{ clientX: 50, clientY: 50 }],
    });

    // 产生滑动移动 30px
    fireEvent.touchMove(trigger, {
      touches: [{ clientX: 50, clientY: 80 }],
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByText("操作项")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("按 Escape 键应该关闭菜单", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="esc-card">卡片</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>选项</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("esc-card"), {
      clientX: 50,
      clientY: 50,
    });
    expect(screen.getByText("选项")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("选项")).not.toBeInTheDocument();
  });
});
