import { Save, Search } from "lucide-react";

import { PreferenceTagSelector } from "@/features/preferences/components/PreferenceTagSelector";
import type { PreferencesFormValue } from "@/features/preferences/lib/preferencesMapper";
import { AuthorModePicker } from "@/features/search/components/AuthorModePicker";
import { Select } from "@/shared/ui/Select";

interface ChannelOption {
  id: string;
  name: string;
}

interface MePreferencesSectionProps {
  availablePreferenceTags: string[];
  channelOptions: ChannelOption[];
  form: PreferencesFormValue;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  onSave: () => void;
  onToggleChannel: (channelId: string) => void;
  onUpdateForm: (
    updater: (prev: PreferencesFormValue) => PreferencesFormValue,
  ) => void;
}

export function MePreferencesSection({
  availablePreferenceTags,
  channelOptions,
  form,
  isDirty,
  isLoading,
  isSaving,
  isSyncing,
  onSave,
  onToggleChannel,
  onUpdateForm,
}: MePreferencesSectionProps) {
  return (
    <section className="px-1">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-(--od-accent)" />
          <h2 className="od-text-title">发现偏好</h2>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="od-inline-action od-inline-action-primary disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "保存中..." : "保存偏好"}
        </button>
      </div>

      {isLoading ? (
        <p className="od-text-body">正在加载你的偏好设置...</p>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-(--od-text-primary)">
              偏好频道
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {channelOptions.map((channel) => {
                const active = form.preferredChannelIds.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onToggleChannel(channel.id)}
                    className={`rounded-2xl border-0 px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? "bg-(--od-accent)/10 text-(--od-accent) font-od-medium"
                        : "bg-transparent text-(--od-text-secondary) font-od-normal hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                    }`}
                  >
                    {channel.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-(--od-text-secondary)">
                默认排序
              </span>
              <Select
                value={form.sortMethod}
                options={[
                  { value: 'last_active_desc', label: '最后活跃' },
                  { value: 'created_desc', label: '最新发布' },
                  { value: 'reaction_desc', label: '点赞热度' },
                  { value: 'reply_desc', label: '讨论热度' },
                  { value: 'relevance', label: '综合推荐' },
                ]}
                onChange={(v) => {
                  onUpdateForm((prev) => ({
                    ...prev,
                    sortMethod: v as PreferencesFormValue["sortMethod"],
                  }));
                }}
                className="w-full"
              />
            </label>

            <label className="block space-y-2">
              <span className="block text-sm font-medium text-(--od-text-secondary)">
                BOT 每页条数
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={form.resultsPerPage}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateForm((prev) => ({
                    ...prev,
                    resultsPerPage: val === "" ? "" : Number(val),
                  }));
                }}
                className="od-ghost-input min-h-10 w-full px-1 text-sm"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-(--od-text-primary)">
                作者偏好
              </p>
              <p className="mt-1 text-sm leading-6 text-(--od-text-secondary)">
                输入作者名称后，用 + 只看该作者，用 − 屏蔽该作者。
              </p>
            </div>
            <AuthorModePicker
              selected={[
                ...form.includeAuthorIds.map((id) => ({ id, mode: "include" as const })),
                ...form.excludeAuthorIds.map((id) => ({ id, mode: "exclude" as const })),
              ]}
              onSelect={(author, mode) => {
                onUpdateForm((prev) => ({
                  ...prev,
                  includeAuthorIds:
                    mode === "include"
                      ? Array.from(new Set([...prev.includeAuthorIds, author.id]))
                      : prev.includeAuthorIds.filter((id) => id !== author.id),
                  excludeAuthorIds:
                    mode === "exclude"
                      ? Array.from(new Set([...prev.excludeAuthorIds, author.id]))
                      : prev.excludeAuthorIds.filter((id) => id !== author.id),
                }));
              }}
              onRemove={(selection) => {
                onUpdateForm((prev) => ({
                  ...prev,
                  includeAuthorIds:
                    selection.mode === "include"
                      ? prev.includeAuthorIds.filter((id) => id !== selection.id)
                      : prev.includeAuthorIds,
                  excludeAuthorIds:
                    selection.mode === "exclude"
                      ? prev.excludeAuthorIds.filter((id) => id !== selection.id)
                      : prev.excludeAuthorIds,
                }));
              }}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <PreferenceTagSelector
              label="包含标签"
              placeholder="还没有设置正选标签"
              selectedTags={form.includeTagsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)}
              availableTags={availablePreferenceTags.filter(
                (tag) =>
                  !form.excludeTagsText
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .includes(tag),
              )}
              tone="include"
              onChange={(tags) => {
                onUpdateForm((prev) => ({
                  ...prev,
                  includeTagsText: tags.join(", "),
                }));
              }}
            />
            <PreferenceTagSelector
              label="排除标签"
              placeholder="还没有设置反选标签"
              selectedTags={form.excludeTagsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)}
              availableTags={availablePreferenceTags.filter(
                (tag) =>
                  !form.includeTagsText
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .includes(tag),
              )}
              tone="exclude"
              onChange={(tags) => {
                onUpdateForm((prev) => ({
                  ...prev,
                  excludeTagsText: tags.join(", "),
                }));
              }}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-(--od-text-secondary)">
                关键词包含
              </span>
              <textarea
                value={form.includeKeywordsText}
                onChange={(e) => {
                  onUpdateForm((prev) => ({
                    ...prev,
                    includeKeywordsText: e.target.value,
                  }));
                }}
                className="od-ghost-input min-h-[110px] w-full px-1 py-3 text-sm"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-(--od-text-tertiary)">
                支持多组关键词组合：使用逗号 <code className="px-1 text-(--od-accent)">,</code> 分隔表示“且”（AND），使用斜杠 <code className="px-1 text-(--od-accent)">/</code> 分隔表示“或”（OR）。
                <br />
                精确匹配请使用双引号包裹，例如 <code className="px-1 text-(--od-accent)">"</code>
                <a
                  href="https://ys.mihoyo.com/main/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-0.5 text-(--od-accent) underline-offset-2 hover:underline"
                >
                  原神
                </a>
                <code className="px-1 text-(--od-accent)">"</code>。搜索不区分大小写。
              </p>
            </label>
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-(--od-text-secondary)">
                关键词排除
              </span>
              <textarea
                value={form.excludeKeywordsText}
                onChange={(e) => {
                  onUpdateForm((prev) => ({
                    ...prev,
                    excludeKeywordsText: e.target.value,
                  }));
                }}
                className="od-ghost-input min-h-[110px] w-full px-1 py-3 text-sm"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-(--od-text-tertiary)">
                使用逗号、空格或斜杠分隔多个词。包含这些词的帖子将被隐藏。
                <br />
                特别地，若关键词附近带有“禁”或“🈲”标记，则会自动豁免，不会被屏蔽。
              </p>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="od-text-meta">
              当前状态：
              {isSyncing ? "同步中" : isDirty ? "有未保存修改" : "已同步"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
