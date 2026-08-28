import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThreadStatusBadges } from "./ThreadStatusBadges";

describe("ThreadStatusBadges", () => {
  it("用 NEW 文字徽标表示作品更新，且徽标不加暗色描边", () => {
    render(
      <ThreadStatusBadges viewerFlags={["followed", "unread"]} />,
    );

    const updateBadge = screen.getByText("NEW");
    const followBadge = screen.getByTitle("你已关注此帖子");

    expect(updateBadge).toBeInTheDocument();
    expect(updateBadge).not.toHaveClass("ring-2");
    expect(followBadge).not.toHaveClass("ring-2");
  });
});
