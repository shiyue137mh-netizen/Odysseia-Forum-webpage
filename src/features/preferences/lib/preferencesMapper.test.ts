import { describe, expect, it } from "vitest";

import type { UserPreferencesResponse } from "@/features/preferences/api/preferencesApi";
import {
  toPreferencesFormValue,
  toPreferencesUpdatePayload,
} from "./preferencesMapper";

describe("preferencesMapper 作者偏好", () => {
  it("保留作者 ID 的正反选择", () => {
    const form = toPreferencesFormValue(
      {
        user_id: 1,
        include_authors: ["123"],
        exclude_authors: ["456"],
      } as unknown as UserPreferencesResponse,
    );

    expect(form.includeAuthorIds).toEqual(["123"]);
    expect(form.excludeAuthorIds).toEqual(["456"]);
    expect(toPreferencesUpdatePayload(form)).toEqual(
      expect.objectContaining({
        include_authors: ["123"],
        exclude_authors: ["456"],
      }),
    );
  });

  it("把 BOT 每页条数写入 results_per_page 并保留 UI 页大小", () => {
    const form = toPreferencesFormValue({
      results_per_page: 7,
      ui_page_size: 48,
    } as UserPreferencesResponse);

    form.resultsPerPage = 12;

    expect(toPreferencesUpdatePayload(form)).toEqual(
      expect.objectContaining({
        results_per_page: 12,
        ui_page_size: 48,
      }),
    );
  });
});
