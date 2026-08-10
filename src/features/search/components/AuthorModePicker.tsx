import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, X } from "lucide-react";

import {
  searchApi,
  type SearchSuggestionAuthor,
} from "@/features/search/api/searchApi";
import { useAuthorProfiles } from "@/features/authors/hooks/useAuthorProfiles";
import type { SearchTokenMode } from "@/shared/lib/searchTokenizer";
import { LazyImage } from "@/shared/ui/LazyImage";

export interface AuthorModeSelection {
  id: string;
  mode: SearchTokenMode;
}

interface AuthorModePickerProps {
  selected: AuthorModeSelection[];
  onSelect: (author: SearchSuggestionAuthor, mode: SearchTokenMode) => void;
  onRemove: (selection: AuthorModeSelection) => void;
}

export function AuthorModePicker({
  selected,
  onSelect,
  onRemove,
}: AuthorModePickerProps) {
  const [draft, setDraft] = useState("");
  const keyword = useDeferredValue(draft.trim());
  const profiles = useAuthorProfiles(selected.map((item) => item.id));
  const { data } = useQuery({
    queryKey: ["search", "author-picker", keyword],
    queryFn: () => searchApi.getSuggestions(keyword, false),
    enabled: keyword.length > 0,
    staleTime: 30 * 1000,
  });

  const selectedMode = (authorId: string) =>
    selected.find((item) => item.id === authorId)?.mode;

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 items-center gap-2 border-b border-(--od-border) px-1 focus-within:border-(--od-accent)">
        <Search className="h-4 w-4 shrink-0 text-(--od-text-tertiary)" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入作者昵称或用户名"
          className="min-w-0 flex-1 bg-transparent text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
        />
      </div>

      {keyword && data?.authors?.length ? (
        <div className="space-y-1 py-1.5">
          {data.authors.map((author) => {
            const mode = selectedMode(author.id);
            const name = author.display_name || author.name;
            return (
              <div key={author.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-(--od-bg-tertiary)">
                <LazyImage
                  src={author.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png"}
                  alt={name}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-(--od-text-primary)">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(author, "include")}
                  aria-label={`包含作者 ${name}`}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${mode === "include" ? "bg-emerald-500/20 text-emerald-300" : "text-(--od-text-tertiary) hover:bg-emerald-500/15 hover:text-emerald-300"}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(author, "exclude")}
                  aria-label={`排除作者 ${name}`}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${mode === "exclude" ? "bg-rose-500/20 text-rose-300" : "text-(--od-text-tertiary) hover:bg-rose-500/15 hover:text-rose-300"}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((selection) => {
            const profile = profiles[selection.id];
            const name = profile?.display_name || profile?.name || selection.id;
            return (
              <button
                key={`${selection.mode}-${selection.id}`}
                type="button"
                onClick={() => onRemove(selection)}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${selection.mode === "exclude" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}
              >
                <LazyImage
                  src={profile?.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png"}
                  alt={name}
                  className="h-4 w-4 shrink-0 rounded-full object-cover"
                />
                <span className="max-w-32 truncate">
                  {selection.mode === "exclude" ? "−" : "+"} {name}
                </span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
