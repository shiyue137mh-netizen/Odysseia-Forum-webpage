import { fireEvent, render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { searchApi } from "@/features/search/api/searchApi";
import { AuthorModePicker } from "./AuthorModePicker";

vi.mock("@/features/search/api/searchApi", () => ({
  searchApi: { getSuggestions: vi.fn() },
}));

describe("AuthorModePicker", () => {
  beforeEach(() => {
    vi.mocked(searchApi.getSuggestions).mockResolvedValue({
      authors: [
        {
          id: "123",
          name: "author_name",
          display_name: "作者名",
          avatar_url: null,
        },
      ],
    });
  });

  it("允许从同一条作者建议正选或反选", async () => {
    const onSelect = vi.fn();
    render(
      <AuthorModePicker selected={[]} onSelect={onSelect} onRemove={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText("输入作者昵称或用户名"), {
      target: { value: "作者" },
    });

    fireEvent.click(await screen.findByRole("button", { name: "包含作者 作者名" }));
    fireEvent.click(screen.getByRole("button", { name: "排除作者 作者名" }));

    expect(onSelect).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: "123" }),
      "include",
    );
    expect(onSelect).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: "123" }),
      "exclude",
    );
  });
});
