import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/tests/test-utils";
import { booklistsApi } from "@/features/booklists/api/booklistsApi";
import { useMyBooklistsList } from "@/features/booklists/hooks/useBooklistsData";
import { QuickAddToBooklistModal } from "./QuickAddToBooklistModal";

vi.mock("@/features/booklists/hooks/useBooklistsData", () => ({
  useMyBooklistsList: vi.fn(),
}));
vi.mock("@/features/booklists/api/booklistsApi", () => ({
  booklistsApi: { syncItems: vi.fn() },
}));
vi.mock("@/features/mascot/lib/notify", () => ({
  extractErrorMessage: (_error: unknown, fallback: string) => fallback,
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const results = [
  {
    id: 1,
    title: "已加入",
    item_count: 2,
    collection_count: 3,
    is_marked: true,
  },
  {
    id: 2,
    title: "未加入",
    item_count: 4,
    collection_count: 5,
    is_marked: false,
  },
];

describe("QuickAddToBooklistModal", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMyBooklistsList).mockReturnValue({
      data: { results },
      isLoading: false,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as never);
    vi.mocked(booklistsApi.syncItems).mockResolvedValue({
      thread_id: "1234567890123456789",
      added_to_booklist_ids: [2],
      removed_from_booklist_ids: [1],
    });
  });

  it("preselects marked booklists and syncs additions and removals together", async () => {
    render(
      <QuickAddToBooklistModal
        isOpen
        threadId="1234567890123456789"
        onClose={vi.fn()}
      />,
    );

    const marked = await screen.findByRole("checkbox", { name: /已加入/ });
    const unmarked = screen.getByRole("checkbox", { name: /未加入/ });
    expect(useMyBooklistsList).toHaveBeenCalledWith({
      markThreadId: "1234567890123456789",
      enabled: true,
    });
    expect(marked).toBeChecked();
    expect(unmarked).not.toBeChecked();

    fireEvent.click(marked);
    fireEvent.click(unmarked);
    fireEvent.change(screen.getByPlaceholderText(/所有勾选/), {
      target: { value: "  推荐语  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存书单" }));

    await waitFor(() =>
      expect(booklistsApi.syncItems).toHaveBeenCalledWith({
        thread_id: "1234567890123456789",
        scope_booklist_ids: [1, 2],
        target_booklist_ids: [2],
        comment: "推荐语",
      }),
    );
  });

  it("can remove the thread from every displayed booklist without sending a comment", async () => {
    render(<QuickAddToBooklistModal isOpen threadId="99" onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("checkbox", { name: /已加入/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存书单" }));

    await waitFor(() =>
      expect(booklistsApi.syncItems).toHaveBeenCalledWith({
        thread_id: "99",
        scope_booklist_ids: [1, 2],
        target_booklist_ids: [],
        comment: undefined,
      }),
    );
  });
});
