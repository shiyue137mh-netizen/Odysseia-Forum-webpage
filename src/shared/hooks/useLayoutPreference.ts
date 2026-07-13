import { useCallback, useEffect, useState } from "react";

export type LayoutMode = "grid" | "list" | "masonry";

const LAYOUT_PREFERENCES_KEY = "odysseia_layout_preferences";
const LAYOUT_PREFERENCE_EVENT = "odysseia:layout-preference-change";

function isLayoutMode(value: unknown): value is LayoutMode {
  return value === "grid" || value === "list" || value === "masonry";
}

function readPreferences(): Record<string, LayoutMode> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LAYOUT_PREFERENCES_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed).reduce<Record<string, LayoutMode>>(
      (acc, [scope, mode]) => {
        if (isLayoutMode(mode)) acc[scope] = mode;
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writePreference(scope: string, mode: LayoutMode) {
  if (typeof window === "undefined") return;

  const next = {
    ...readPreferences(),
    [scope]: mode,
  };
  window.localStorage.setItem(LAYOUT_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(LAYOUT_PREFERENCE_EVENT, {
      detail: { scope, mode },
    }),
  );
}

export function getLayoutPreference(
  scope: string,
  fallback: LayoutMode,
): LayoutMode {
  return readPreferences()[scope] ?? fallback;
}

export function useLayoutPreference(
  scope: string,
  fallback: LayoutMode = "grid",
) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() =>
    getLayoutPreference(scope, fallback),
  );

  useEffect(() => {
    setLayoutModeState(getLayoutPreference(scope, fallback));
  }, [fallback, scope]);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { scope?: string; mode?: LayoutMode }
        | undefined;
      if (detail?.scope && detail.scope !== scope) return;
      setLayoutModeState(getLayoutPreference(scope, fallback));
    };

    window.addEventListener("storage", handleChange);
    window.addEventListener(LAYOUT_PREFERENCE_EVENT, handleChange);

    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(LAYOUT_PREFERENCE_EVENT, handleChange);
    };
  }, [fallback, scope]);

  const setLayoutMode = useCallback(
    (mode: LayoutMode) => {
      setLayoutModeState(mode);
      writePreference(scope, mode);
    },
    [scope],
  );

  return [layoutMode, setLayoutMode] as const;
}
