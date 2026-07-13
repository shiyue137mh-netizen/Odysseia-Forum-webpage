const STORAGE_KEY = "odysseia_search_discovery_tags_v1";
const MAX_SCOPES = 20;

interface StoredTagScope {
  tags: string[];
  updatedAt: number;
}

type StoredTagScopes = Record<string, StoredTagScope>;

function readScopes(): StoredTagScopes {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function getStoredDiscoveryTags(scope: string, availableTags: string[]) {
  const available = new Set(availableTags);
  const tags = readScopes()[scope]?.tags?.filter((tag) => available.has(tag));
  return tags?.length === 2 ? tags : null;
}

export function saveDiscoveryTags(
  scope: string,
  tags: string[],
  updatedAt = Date.now(),
) {
  if (typeof window === "undefined") return;
  const scopes = readScopes();
  scopes[scope] = { tags: tags.slice(0, 2), updatedAt };
  const trimmed = Object.fromEntries(
    Object.entries(scopes)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SCOPES),
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function chooseDiscoveryTags(
  availableTags: string[],
  currentTags: string[] = [],
  random = Math.random,
) {
  const unique = Array.from(new Set(availableTags.filter(Boolean)));
  const alternatives = unique.filter((tag) => !currentTags.includes(tag));
  const source = alternatives.length >= 2 ? alternatives : unique;
  for (let index = source.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [source[index], source[nextIndex]] = [source[nextIndex], source[index]];
  }
  return source.slice(0, 2);
}
