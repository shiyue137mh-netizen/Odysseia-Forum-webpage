import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PreferenceTagSelectorProps {
  label: string;
  placeholder: string;
  selectedTags: string[];
  availableTags: string[];
  tone: 'include' | 'exclude';
  onChange: (tags: string[]) => void;
}

function normalize(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function PreferenceTagSelector({
  label,
  placeholder,
  selectedTags,
  availableTags,
  tone,
  onChange,
}: PreferenceTagSelectorProps) {
  const [draft, setDraft] = useState('');

  const filteredOptions = useMemo(() => {
    const lower = draft.trim().toLowerCase();
    return availableTags
      .filter((tag) => !selectedTags.includes(tag))
      .filter((tag) => !lower || tag.toLowerCase().includes(lower))
      .slice(0, 12);
  }, [availableTags, draft, selectedTags]);

  const addTag = (tag: string) => {
    onChange(normalize([...selectedTags, tag]));
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((item) => item !== tag));
  };

  const chipClass = tone === 'include'
    ? 'bg-emerald-500/10 text-emerald-300'
    : 'bg-rose-500/10 text-rose-300';

  return (
    <div className="block space-y-2">
      <span className="block text-sm font-medium text-(--od-text-secondary)">{label}</span>

      <div className="py-1">
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${chipClass}`}
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
          {selectedTags.length === 0 && (
            <span className="text-sm text-(--od-text-tertiary)">{placeholder}</span>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="搜索并选择标签..."
            className="od-ghost-input min-h-10 w-full px-1 text-sm"
          />

          <div className="flex max-h-[150px] flex-wrap gap-2 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-full border-0 bg-transparent px-3 py-1 text-xs text-(--od-text-secondary) transition-colors hover:bg-(--od-interactive-hover) hover:text-(--od-text-primary)"
                >
                  {tag}
                </button>
              ))
            ) : (
              <span className="text-xs text-(--od-text-tertiary)">没有更多可选标签</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
