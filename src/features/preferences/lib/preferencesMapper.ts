import type {
  UserPreferencesResponse,
  UserPreferencesUpdateRequest,
} from '@/features/preferences/api/preferencesApi';

export type PreferencesSortUi =
  | 'relevance'
  | 'last_active_desc'
  | 'created_desc'
  | 'reply_desc'
  | 'reaction_desc';

export interface PreferencesFormValue {
  preferredChannelIds: string[];
  includeAuthorIds: string[];
  excludeAuthorIds: string[];
  includeTagsText: string;
  excludeTagsText: string;
  includeKeywordsText: string;
  excludeKeywordsText: string;
  previewImageMode: 'thumbnail' | 'full' | 'none';
  resultsPerPage: number | '';
  uiPageSize: number;
  sortMethod: PreferencesSortUi;
}

const sortApiToUiMap: Record<string, PreferencesSortUi> = {
  comprehensive: 'relevance',
  last_active: 'last_active_desc',
  created_at: 'created_desc',
  reply_count: 'reply_desc',
  reaction_count: 'reaction_desc',
};

const sortUiToApiMap: Record<PreferencesSortUi, string> = {
  relevance: 'comprehensive',
  last_active_desc: 'last_active',
  created_desc: 'created_at',
  reply_desc: 'reply_count',
  reaction_desc: 'reaction_count',
};

function normalizePreviewMode(mode?: string | null): 'thumbnail' | 'full' | 'none' {
  if (mode === 'full') return 'full';
  if (mode === 'none') return 'none';
  return 'thumbnail';
}

function parseCommaSeparatedText(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toPreferencesFormValue(prefs?: UserPreferencesResponse | null): PreferencesFormValue {
  return {
    preferredChannelIds: (prefs?.preferred_channels || []).map((id) => String(id)),
    includeAuthorIds: (prefs?.include_authors || []).map((id) => String(id)),
    excludeAuthorIds: (prefs?.exclude_authors || []).map((id) => String(id)),
    includeTagsText: (prefs?.include_tags || []).join(', '),
    excludeTagsText: (prefs?.exclude_tags || []).join(', '),
    includeKeywordsText: prefs?.include_keywords || '',
    excludeKeywordsText: prefs?.exclude_keywords || '',
    previewImageMode: normalizePreviewMode(prefs?.preview_image_mode),
    resultsPerPage: Number(prefs?.results_per_page ?? 5),
    uiPageSize: Number(prefs?.ui_page_size ?? 48),
    sortMethod: sortApiToUiMap[prefs?.sort_method || ''] || 'last_active_desc',
  };
}

export function toPreferencesUpdatePayload(
  value: PreferencesFormValue,
): UserPreferencesUpdateRequest {
  const includeTags = parseCommaSeparatedText(value.includeTagsText);
  const excludeTags = parseCommaSeparatedText(value.excludeTagsText);
  const preferredChannels = value.preferredChannelIds
    .map((id) => String(id).trim())
    .filter((id) => /^\d+$/.test(id));

  return {
    // Discord snowflake exceeds JS safe integer range.
    // Keep raw digit strings in JSON so backend can parse them without precision loss.
    preferred_channels: preferredChannels,
    include_authors: value.includeAuthorIds,
    exclude_authors: value.excludeAuthorIds,
    include_tags: includeTags,
    exclude_tags: excludeTags,
    include_keywords: value.includeKeywordsText.trim(),
    exclude_keywords: value.excludeKeywordsText.trim(),
    preview_image_mode: value.previewImageMode,
    results_per_page: 5,
    ui_page_size: value.resultsPerPage === '' ? 24 : value.resultsPerPage,
    sort_method: sortUiToApiMap[value.sortMethod] || 'last_active',
  };
}

