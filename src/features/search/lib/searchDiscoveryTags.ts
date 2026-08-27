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

function shuffled(values: string[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }
  return result;
}

export function chooseSuggestedTags(
  availableTags: string[],
  preferredTags: string[] = [],
  limit = 5,
  random = Math.random,
) {
  const available = Array.from(new Set(availableTags.filter(Boolean)));
  if (preferredTags.length === 0) {
    return shuffled(available, random).slice(0, limit);
  }

  const preferredSet = new Set(preferredTags);
  const preferred = shuffled(
    preferredTags.filter((tag) => available.includes(tag)),
    random,
  );
  const others = shuffled(
    available.filter((tag) => !preferredSet.has(tag)),
    random,
  );
  const preferredLimit = others.length > 0 ? Math.max(0, limit - 1) : limit;
  const selectedPreferred = preferred.slice(0, preferredLimit);
  return [
    ...selectedPreferred,
    ...others.slice(0, limit - selectedPreferred.length),
  ];
}
