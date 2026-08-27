import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddThreadsToBooklistModal } from "./AddThreadsToBooklistModal";

describe("AddThreadsToBooklistModal", () => {
  it("关闭后重新打开会清空上一次输入", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <AddThreadsToBooklistModal
        isOpen
        enableTournamentFields
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    const textboxes = screen.getAllByRole("textbox");
    const dialog = screen.getByRole("dialog");
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog.parentElement).toBe(document.body);
    fireEvent.change(textboxes[0], {
      target: { value: "123456789012345678" },
    });
    fireEvent.change(textboxes[1], {
      target: { value: "备注" },
    });
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, {
      target: { value: "2026-08-27T12:30" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "4" },
    });

    rerender(
      <AddThreadsToBooklistModal
        isOpen={false}
        enableTournamentFields
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );
    rerender(
      <AddThreadsToBooklistModal
        isOpen
        enableTournamentFields
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    const reopenedTextboxes = screen.getAllByRole("textbox");
    expect(reopenedTextboxes[0]).toHaveValue("");
    expect(reopenedTextboxes[1]).toHaveValue("");
    expect(document.querySelector('input[type="datetime-local"]')).toHaveValue("");
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });

  it("提交失败且弹窗保持打开时保留输入", () => {
    const onSubmit = vi.fn();
    render(
      <AddThreadsToBooklistModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const ids = screen.getAllByRole("textbox")[0];
    fireEvent.change(ids, { target: { value: "123456789012345678" } });
    fireEvent.click(screen.getByRole("button", { name: "添加到书单" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(ids).toHaveValue("123456789012345678");
  });
});
