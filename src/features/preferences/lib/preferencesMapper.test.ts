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
});
